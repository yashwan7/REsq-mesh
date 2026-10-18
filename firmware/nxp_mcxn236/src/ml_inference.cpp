#include "ml_inference.h"

#include <cstdio>
#include <cstdint>
#include <algorithm>

#include "board.h"
#include "fsl_device_registers.h"
#include "model_data.h"
#include "telemetry.h"
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

static uint32_t start_cycles()
{
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CYCCNT = 0U;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
    return DWT->CYCCNT;
}

bool init_resqmesh_model() {
    g_model = tflite::GetModel(resqmesh_mcx_int8_tflite);
    if (g_model == nullptr || g_model->version() != TFLITE_SCHEMA_VERSION) {
        Guardian_TelemetryPrint("[ML] Schema mismatch error!\r\n");
        return false;
    }

    // Register CMSIS-NN accelerated ops on Cortex-M33
    static tflite::MicroMutableOpResolver<3> resolver;
    if (resolver.AddFullyConnected() != kTfLiteOk ||
        resolver.AddRelu() != kTfLiteOk ||
        resolver.AddSoftmax() != kTfLiteOk) {
        Guardian_TelemetryPrint("[ML] Resolver register error!\r\n");
        return false;
    }

    static tflite::MicroInterpreter static_interpreter(
        g_model, resolver, tensor_arena, kTensorArenaSize);
    g_interpreter = &static_interpreter;

    if (g_interpreter->AllocateTensors() != kTfLiteOk) {
        Guardian_TelemetryPrint("[ML] AllocateTensors failed!\r\n");
        return false;
    }

    g_input = g_interpreter->input(0);
    g_output = g_interpreter->output(0);
    return true;
}

int predict_wireless_link(float rssi, float snr, float per, int retries, float cbr, float jitter) {
    if (g_interpreter == nullptr) {
        if (!init_resqmesh_model()) {
            return -1;
        }
    }

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
        Guardian_TelemetryPrint("[ML] Inference invocation error!\r\n");
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

extern "C" void Guardian_MlRunDemo(void)
{
    Guardian_TelemetryPrint("[ML] INT8 TFLM ResQMesh Link Predictor Demo Start\r\n");

    if (!init_resqmesh_model()) {
        Guardian_TelemetryPrint("[ML] Model Init Failed!\r\n");
        return;
    }

    Guardian_TelemetryPrint("[ML] Model Loaded on FRDM-MCXN236! (Arena: 4 KB)\r\n");

    // Test Case: Degraded wireless link condition
    uint32_t before = start_cycles();
    int link_status = predict_wireless_link(-82.0f, 5.0f, 0.45f, 3, 0.65f, 42.0f);
    uint32_t cycles = DWT->CYCCNT - before;

    Guardian_TelemetryPrint("[ML] Prediction: ");
    if (link_status >= 0 && link_status < 3) {
        Guardian_TelemetryPrint(LINK_STATUS_STR[link_status]);
    } else {
        Guardian_TelemetryPrint("ERROR");
    }

    Guardian_TelemetryPrint(" | Arena used: ");
    Guardian_TelemetryPrintU32((uint32_t)g_interpreter->arena_used_bytes());
    Guardian_TelemetryPrint(" bytes | Cycles: ");
    Guardian_TelemetryPrintU32(cycles);
    Guardian_TelemetryPrint(" | Latency: ");
    Guardian_TelemetryPrintU32(SystemCoreClock == 0U ? 0U :
                               (uint32_t)(((uint64_t)cycles * 1000000ULL) / SystemCoreClock));
    Guardian_TelemetryPrint(" us\r\n");
}
