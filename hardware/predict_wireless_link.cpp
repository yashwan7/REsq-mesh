#include <cstdio>
#include <cstdint>
#include <algorithm>

#include "model_data.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/schema/schema_generated.h"

// 4 KB SRAM allocation is sufficient for this ~4.5 KB model
constexpr int kTensorArenaSize = 4096;
alignas(16) static uint8_t tensor_arena[kTensorArenaSize];

// Pointers for TFLM engine
static const tflite::Model* g_model = nullptr;
static tflite::MicroInterpreter* g_interpreter = nullptr;
static TfLiteTensor* g_input = nullptr;
static TfLiteTensor* g_output = nullptr;

static const float SCALER_MEAN[6]  = {-74.4619f, 10.8021f, 0.5725f, 3.0082f, 0.4419f, 37.9668f};
static const float SCALER_SCALE[6] = { 16.1695f, 10.1637f, 0.2187f, 1.3891f, 0.1768f, 28.3729f};

const char* LINK_STATUS_STR[] = {
    "NORMAL_RUN (0)",
    "DEGRADING (1)",
    "CRITICAL_FAILOVER (2)"
};

bool init_resqmesh_model() {
    g_model = tflite::GetModel(resqmesh_mcx_int8_tflite);
    if (g_model == nullptr || g_model->version() != TFLITE_SCHEMA_VERSION) {
        printf("Schema mismatch error!\r\n");
        return false;
    }

    // Register CMSIS-NN accelerated ops on Cortex-M33
    static tflite::MicroMutableOpResolver<3> resolver;
    resolver.AddFullyConnected();
    resolver.AddRelu();
    resolver.AddSoftmax();

    static tflite::MicroInterpreter static_interpreter(
        g_model, resolver, tensor_arena, kTensorArenaSize);
    g_interpreter = &static_interpreter;

    if (g_interpreter->AllocateTensors() != kTfLiteOk) {
        printf("AllocateTensors failed!\r\n");
        return false;
    }

    g_input = g_interpreter->input(0);
    g_output = g_interpreter->output(0);
    return true;
}

int predict_wireless_link(float rssi, float snr, float per, int retries, float cbr, float jitter) {
    float raw[6] = {rssi, snr, per, (float)retries, cbr, jitter};

    // 1. Z-Score Normalization & INT8 Quantization
    for (int i = 0; i < 6; i++) {
        float normalized = (raw[i] - SCALER_MEAN[i]) / SCALER_SCALE[i];
        int32_t quantized = (int32_t)(normalized / g_input->params.scale) + g_input->params.zero_point;
        quantized = std::max(-128, std::min(127, quantized));
        g_input->data.int8[i] = (int8_t)quantized;
    }

    // 2. Invoke Inference on ARM Cortex-M33
    if (g_interpreter->Invoke() != kTfLiteOk) {
        printf("Inference invocation error!\r\n");
        return -1;
    }

    // 3. Argmax Output
    int8_t max_score = -128;
    int predicted_class = 0;
    for (int i = 0; i < 3; i++) {
        if (g_output->data.int8[i] > max_score) {
            max_score = g_output->data.int8[i];
            predicted_class = i;
        }
    }

    return predicted_class;
}

// Example usage inside main()
int main(void) {
    // Board initialization (System clocks, UART, etc.)
    if (!init_resqmesh_model()) {
        printf("Failed to initialize TinyML model\r\n");
        return 1;
    }

    printf("TinyML Model Loaded on FRDM-MCXN236!\r\n");

    // Test Sample: Degraded link condition
    // rssi: -82.0 dBm, snr: 5.0 dB, PER: 0.45, Retries: 3, CBR: 0.65, Jitter: 42.0 ms
    int link_status = predict_wireless_link(-82.0f, 5.0f, 0.45f, 3, 0.65f, 42.0f);
    if (link_status >= 0 && link_status < 3) {
        printf("Link State: %s\r\n", LINK_STATUS_STR[link_status]);
    } else {
        printf("Link State: UNKNOWN_ERROR\r\n");
    }

    return 0;
}
