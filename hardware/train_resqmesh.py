#!/usr/bin/env python3
"""
ResQMesh TinyML training + INT8 export for NXP FRDM-MCXN236.

CSV columns required:
rssi_dbm, snr_db, packet_error_rate, retry_count,
channel_busy_ratio, jitter_ms, label

Labels: 0=NORMAL_RUN, 1=DEGRADING, 2=CRITICAL_FAILOVER

Install:
  python -m pip install numpy pandas scikit-learn matplotlib tensorflow

Run:
  python train_resqmesh.py --csv resqmesh_wireless_channel_100k.csv

Important:
- The model receives STANDARDIZED features. Apply the saved mean/std on-device
  before quantizing the six input values for the INT8 TFLite model.
- Synthetic-data metrics are not proof of real-radio performance.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)

FEATURES = [
    "rssi_dbm", "snr_db", "packet_error_rate",
    "retry_count", "channel_busy_ratio", "jitter_ms"
]
LABELS = ["NORMAL_RUN", "DEGRADING", "CRITICAL_FAILOVER"]
SEED = 42


def build_model():
    # Approximately 612,099 trainable parameters; actual exported size depends
    # on quantization and TensorFlow Lite conversion.
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(6,), name="standardized_features"),
        tf.keras.layers.Dense(640, activation="relu"),
        tf.keras.layers.Dense(640, activation="relu"),
        tf.keras.layers.Dense(256, activation="relu"),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dense(3, activation="softmax", name="class_probabilities"),
    ], name="ResQMesh_MLP")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to the dataset CSV")
    parser.add_argument("--out", default="resqmesh_artifacts", help="Output folder")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=256)
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    tf.keras.utils.set_random_seed(SEED)

    df = pd.read_csv(args.csv)
    required = FEATURES + ["label"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")
    df = df[required].dropna()
    df["label"] = df["label"].astype(int)
    if not set(df["label"].unique()).issubset({0, 1, 2}):
        raise ValueError("Labels must be 0, 1, or 2.")

    X = df[FEATURES].astype(np.float32).to_numpy()
    y = df["label"].astype(np.int64).to_numpy()

    # 80% development data, then split that into 60% train / 20% validation.
    X_dev, X_test, y_dev, y_test = train_test_split(
        X, y, test_size=0.20, random_state=SEED, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_dev, y_dev, test_size=0.25, random_state=SEED, stratify=y_dev
    )

    # Fit scaler on training data only (prevents validation/test leakage).
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train).astype(np.float32)
    X_val_s = scaler.transform(X_val).astype(np.float32)
    X_test_s = scaler.transform(X_test).astype(np.float32)

    with open(out / "feature_scaler.json", "w") as f:
        json.dump({
            "feature_order": FEATURES,
            "mean": scaler.mean_.tolist(),
            "scale": scaler.scale_.tolist(),
            "formula": "standardized[i] = (raw[i] - mean[i]) / scale[i]",
            "labels": {str(i): name for i, name in enumerate(LABELS)},
        }, f, indent=2)

    model = build_model()
    print("\nModel parameters:", model.count_params())
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=7, restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5
        ),
        tf.keras.callbacks.ModelCheckpoint(
            str(out / "best_resqmesh_model.keras"),
            monitor="val_loss", save_best_only=True
        ),
    ]

    history = model.fit(
        X_train_s, y_train,
        validation_data=(X_val_s, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=2,
    )

    # Test set is held out until final evaluation.
    probabilities = model.predict(X_test_s, batch_size=args.batch_size, verbose=0)
    predictions = probabilities.argmax(axis=1)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(
        y_test, predictions, labels=[0, 1, 2],
        target_names=LABELS, digits=4, zero_division=0
    )
    cm = confusion_matrix(y_test, predictions, labels=[0, 1, 2])

    print(f"\nHELD-OUT FLOAT MODEL TEST ACCURACY: {accuracy:.4%}")
    print("\nClassification report:\n", report)
    print("Confusion matrix (true rows, predicted columns; labels 0,1,2):\n", cm)

    model.save(out / "resqmesh_float_model.keras")
    with open(out / "evaluation.txt", "w") as f:
        f.write(f"Float model held-out test accuracy: {accuracy:.6f}\n\n")
        f.write(report + "\n")
        f.write("Confusion matrix (true rows, predicted columns; labels 0,1,2):\n")
        f.write(np.array2string(cm) + "\n")
    pd.DataFrame(history.history).to_csv(out / "training_history.csv", index=False)

    # Full integer quantization: int8 input and int8 output.
    def representative_dataset():
        # Small representative subset from TRAINING data only.
        count = min(1000, len(X_train_s))
        indices = np.linspace(0, len(X_train_s) - 1, count, dtype=int)
        for i in indices:
            yield [X_train_s[i:i+1].astype(np.float32)]

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    tflite_model = converter.convert()

    tflite_path = out / "resqmesh_int8.tflite"
    tflite_path.write_bytes(tflite_model)
    print(f"\nINT8 TFLite size: {len(tflite_model):,} bytes "
          f"({len(tflite_model)/1024:.1f} KiB)")
    print("Saved:", tflite_path)

    # Verify quantized test accuracy using TFLite interpreter.
    interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
    interpreter.allocate_tensors()
    input_info = interpreter.get_input_details()[0]
    output_info = interpreter.get_output_details()[0]
    in_scale, in_zero = input_info["quantization"]
    out_scale, out_zero = output_info["quantization"]

    q_predictions = []
    for sample in X_test_s:
        x = sample.reshape(1, 6)
        if input_info["dtype"] == np.int8:
            xq = np.clip(np.round(x / in_scale + in_zero), -128, 127).astype(np.int8)
        else:
            xq = x.astype(input_info["dtype"])
        interpreter.set_tensor(input_info["index"], xq)
        interpreter.invoke()
        outq = interpreter.get_tensor(output_info["index"])
        if output_info["dtype"] == np.int8:
            scores = (outq.astype(np.float32) - out_zero) * out_scale
        else:
            scores = outq
        q_predictions.append(int(np.argmax(scores[0])))

    q_accuracy = accuracy_score(y_test, q_predictions)
    print(f"INT8 TFLite held-out test accuracy: {q_accuracy:.4%}")
    print("Input details:", input_info)
    print("Output details:", output_info)
    print("\nArtifacts written to:", out.resolve())
    print("IMPORTANT: firmware must standardize raw features with feature_scaler.json")
    print("in the listed feature order, then quantize using TFLite input scale/zero-point.")


if __name__ == "__main__":
    main()
