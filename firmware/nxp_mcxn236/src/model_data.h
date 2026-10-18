#ifndef RESQMESH_MCX_MODEL_DATA_H
#define RESQMESH_MCX_MODEL_DATA_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

extern const unsigned char resqmesh_mcx_int8_tflite[];
extern const unsigned int resqmesh_mcx_int8_tflite_len;

// Legacy compatibility aliases for NXP firmware build scripts
extern const uint8_t g_nirantara_model[];
extern const unsigned int g_nirantara_model_len;

#ifdef __cplusplus
}
#endif

#endif // RESQMESH_MCX_MODEL_DATA_H
