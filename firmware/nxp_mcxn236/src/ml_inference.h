#ifndef RESQMESH_MCX_ML_INFERENCE_H
#define RESQMESH_MCX_ML_INFERENCE_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

bool init_resqmesh_model(void);
int predict_wireless_link(float rssi, float snr, float per, int retries, float cbr, float jitter);
void Guardian_MlRunDemo(void);

#ifdef __cplusplus
}
#endif

#endif // RESQMESH_MCX_ML_INFERENCE_H
