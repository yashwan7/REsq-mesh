/*
 * =========================================================================================
 * RESQMESH x KSHITIJ: MISSION CONTROL FIELD TERMINAL FIRMWARE (ESP32 #1 MAIN NODE)
 * =========================================================================================
 * Displays:
 *   1. 1.8" SPI TFT (ST7735 160x128): Mission Control Terminal with Non-Blocking Scrolling
 *      AI Decision Ticker (Laya Decision Layer + Qwen3-4B / SmolLM3-3B / Gemma 4 / NXP TinyML)
 *   2. 0.96" I2C OLED (SSD1306 128x64): Compact Tactical Field Telemetry & Queue Counter
 *
 * Connected Hardware:
 *   - NXP FRDM-MCXN236: 10.3ms TinyML Link Anomaly Predictor (via Serial/UART2 on Pins 16/17)
 *   - ESP32 #2 Relay: ESP-NOW Peer for Off-Grid Packet Forwarding
 *   - GPS NEO-6M: Field coordinates (Pins 32/33 or Demo Coords fallback)
 *
 * SPI TFT Pinout (ST7735):
 *   TFT_CS   : GPIO 13
 *   TFT_RST  : GPIO 25
 *   TFT_DC   : GPIO 27
 *   TFT_SCLK : GPIO 18
 *   TFT_MOSI : GPIO 23
 *
 * I2C OLED Pinout (SSD1306):
 *   OLED_SDA : GPIO 21
 *   OLED_SCL : GPIO 22
 *   I2C ADDR : 0x3C
 * =========================================================================================
 */

#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <Adafruit_SSD1306.h>

// ================= HARDWARE PIN CONFIGURATION =================
#define TFT_CS    13
#define TFT_RST   25
#define TFT_DC    27
#define TFT_SCLK  18
#define TFT_MOSI  23

Adafruit_ST7735 tft(TFT_CS, TFT_DC, TFT_RST);

#define OLED_SDA    21
#define OLED_SCL    22
#define OLED_ADDR   0x3C
#define OLED_WIDTH  128
#define OLED_HEIGHT 64

Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// Hardware Serial 2 for NXP FRDM-MCXN236 Telemetry Stream
#define NXP_RX_PIN 16
#define NXP_TX_PIN 17
HardwareSerial NxpSerial(2);

// ================= COLOR PALETTE (KSHITIJ MISSION CONTROL) =================
#define COLOR_BG        ST77XX_BLACK
#define COLOR_PANEL_BG  0x10A2       // Dark Slate / Cyber Navy
#define COLOR_CYAN      ST77XX_CYAN
#define COLOR_GREEN     ST77XX_GREEN
#define COLOR_AMBER     ST77XX_YELLOW
#define COLOR_RED       ST77XX_RED
#define COLOR_WHITE     ST77XX_WHITE
#define COLOR_GRAY      0x7BEF

// ================= SYSTEM TELEMETRY STATE =================
struct ResQMeshTelemetry {
  const char* nodeId = "FIELD-01";
  const char* gpsStatus = "DEMO COORDS";
  const char* gpsCoords = "12.8717N, 77.5768E";
  const char* nxpLinkStatus = "FRDM-MCXN236: OK";
  
  // NXP TinyML Network Health (Inference: 10.3ms)
  const char* netHealth = "HEALTHY";
  uint16_t netColor = COLOR_GREEN;
  int inferenceLatencyMs = 10;
  
  // Incident & Evidence State
  const char* incidentId = "EVT-8042";
  const char* incidentPri = "P1-TRIAGE";
  const char* incidentStatus = "QUEUED [LOCAL]";
  int pendingQueue = 2;
  int ackedCount = 14;
  
  // Active AI Model
  const char* activeModel = "Qwen3-4B";
  bool isDemoMode = true;
  bool isLiveNxpConnected = false;
} tele;

// ================= TICKER STREAM FEED =================
const char* tickerFeed[] = {
  "[LAYA] SYSTEM-1 (16ms): NETWORK DEGRADED -> QUEUE LOCALLY",
  "[NXP-TinyML] LINK STABILITY: 94.2% -> DEGRADING (10.3ms)",
  "[LAYA] NOUL: TOURNIQUET=94% | AIRWAY=91% | FLUID=PFC",
  "[QWEN3-4B] AUDIT REPORT: 0 HALLUCINATIONS | EVIDENCE GROUNDED",
  "[SMOLLM3-3B] APACHE-2.0 REPRODUCIBLE PIPELINE | PENDING RECOVERY",
  "[GEMMA-4-E2B] EDGE BENCHMARK: ZERO QUEUED-VS-DELIVERED CONFUSION",
  "[SYSTEM] LINK RECOVERY TEST -> ZERO DUPLICATE RECONCILIATION"
};
const int tickerTotal = 7;
int tickerIndex = 0;
String currentTickerMsg = "";
int tickerX = 160;

// Timing controllers (strictly non-blocking)
unsigned long lastDashboardUpdate = 0;
unsigned long lastTickerScroll = 0;
unsigned long lastStatePhase = 0;
unsigned long lastNxpPoll = 0;
int demoPhase = 0;

// NXP Telemetry Packet Parser (SOF: 0xA5)
#define NXP_SOF 0xA5
uint8_t nxpBuffer[16];
int nxpBufIdx = 0;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  NxpSerial.begin(115200, SERIAL_8N1, NXP_RX_PIN, NXP_TX_PIN);

  // Initialize SPI TFT Display (ST7735 BlackTab 160x128)
  SPI.begin(TFT_SCLK, -1, TFT_MOSI, TFT_CS);
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1); // 160x128 landscape
  tft.fillScreen(COLOR_BG);

  // Initialize I2C OLED Display (SSD1306 128x64)
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("[ERROR] OLED init failed at 0x3C!"));
  } else {
    Serial.println(F("[OK] OLED SSD1306 initialized."));
  }

  // Render Boot Sequence
  renderBootScreen();
  delay(1400);

  // Initialize Mission Control Dashboard UI
  initTftDashboardLayout();
  currentTickerMsg = tickerFeed[tickerIndex];
}

// ================= BOOT SCREEN =================
void renderBootScreen() {
  tft.fillScreen(COLOR_BG);
  tft.drawRect(2, 2, 156, 124, COLOR_CYAN);
  
  tft.setTextSize(1);
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(12, 18);
  tft.println("RESQMESH x KSHITIJ");

  tft.setTextColor(COLOR_WHITE);
  tft.setCursor(12, 34);
  tft.println("INCIDENT INVESTIGATOR");

  tft.setTextColor(COLOR_GREEN);
  tft.setCursor(12, 54);
  tft.println("NXP TinyML : 10.3ms OK");
  tft.setCursor(12, 68);
  tft.println("LAYA Engine: ACTIVE");
  tft.setCursor(12, 82);
  tft.println("SLM: Qwen3-4B / SmolLM3");
  tft.setCursor(12, 96);
  tft.println("DUAL DISPLAY: MOUNTED");

  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  oled.setCursor(8, 8);
  oled.println("RESQMESH FIELD-01");
  oled.drawLine(0, 22, 127, 22, SSD1306_WHITE);
  oled.setCursor(10, 30);
  oled.println("AI INVESTIGATOR");
  oled.setCursor(10, 44);
  oled.println("OFFLINE-FIRST OK");
  oled.display();
}

// ================= STATIC UI FRAMING (DRAWN ONCE) =================
void initTftDashboardLayout() {
  tft.fillScreen(COLOR_BG);

  // Top Header Bar
  tft.fillRect(0, 0, 160, 18, COLOR_CYAN);
  tft.setTextColor(COLOR_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 5);
  tft.print("RESQMESH");
  tft.setCursor(68, 5);
  tft.print("| FLD-01 [QWEN3]");

  // Panel 1: NXP TinyML Network Health
  tft.drawRoundRect(2, 21, 156, 32, 2, COLOR_GRAY);
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(6, 25);
  tft.print("NXP TinyML LINK:");

  // Panel 2: Evidence-Grounded Incident Status
  tft.drawRoundRect(2, 55, 156, 40, 2, COLOR_GRAY);
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(6, 59);
  tft.print("EVIDENCE / TRIAGE:");

  // Bottom Ticker Frame (Strip: Y=97 to Y=127)
  tft.fillRect(0, 97, 160, 31, COLOR_PANEL_BG);
  tft.drawFastHLine(0, 97, 160, COLOR_CYAN);
  tft.setTextColor(COLOR_AMBER);
  tft.setCursor(4, 101);
  tft.print("[LIVE LAYA/AI STREAM]");
}

// ================= MAIN LOOP =================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Check incoming live NXP serial packets
  readNxpSerial();

  // 2. High-rate non-blocking ticker scroll (~32ms per step)
  if (currentMillis - lastTickerScroll >= 32) {
    lastTickerScroll = currentMillis;
    renderTickerStep();
  }

  // 3. Periodic UI update for main metrics (every 750ms)
  if (currentMillis - lastDashboardUpdate >= 750) {
    lastDashboardUpdate = currentMillis;
    updateTftMetrics();
    updateOledMetrics();
  }

  // 4. Automated 4-Act Demo cycle if running in simulation/demo mode
  if (tele.isDemoMode && (currentMillis - lastStatePhase >= 7000)) {
    lastStatePhase = currentMillis;
    demoPhase = (demoPhase + 1) % 4;

    if (demoPhase == 0) {
      // Act 1: Detect
      tele.netHealth = "HEALTHY";
      tele.netColor = COLOR_GREEN;
      tele.incidentStatus = "EVT-8042 [DETECTED]";
      tele.incidentPri = "P1-CRITICAL";
      tele.pendingQueue = 1;
    } else if (demoPhase == 1) {
      // Act 2: Disconnect
      tele.netHealth = "DEGRADING";
      tele.netColor = COLOR_AMBER;
      tele.incidentStatus = "QUEUED [PENDING RETRY]";
      tele.incidentPri = "P1-CRITICAL";
      tele.pendingQueue = 3;
    } else if (demoPhase == 2) {
      // Act 3: Investigate (ESP-NOW Relay)
      tele.netHealth = "CRITICAL";
      tele.netColor = COLOR_RED;
      tele.incidentStatus = "RELAY VIA ESP-NOW";
      tele.incidentPri = "P1-INVESTIGATED";
      tele.pendingQueue = 3;
    } else {
      // Act 4: Recover (Synced without duplicates)
      tele.netHealth = "HEALTHY (RECOVERED)";
      tele.netColor = COLOR_GREEN;
      tele.incidentStatus = "ACK'D [0 DUPLICATES]";
      tele.incidentPri = "P2-RESOLVED";
      tele.pendingQueue = 0;
      tele.ackedCount += 3;
    }
  }
}

// ================= READ NXP SERIAL TELEMETRY =================
void readNxpSerial() {
  while (NxpSerial.available() > 0) {
    uint8_t b = NxpSerial.read();
    if (b == NXP_SOF) {
      tele.isLiveNxpConnected = true;
      tele.nxpLinkStatus = "NXP MCXN236: LIVE";
      // Read 3 header bytes (type, len_lo, len_hi)
      uint8_t type = NxpSerial.read();
      uint8_t lenLo = NxpSerial.read();
      uint8_t lenHi = NxpSerial.read();
      uint16_t len = lenLo | (lenHi << 8);
      if (len <= 8) {
        uint8_t payload[8];
        NxpSerial.readBytes(payload, len);
        // Byte 1: Button event / update state
        if (payload[1] == 1) {
          tele.incidentStatus = "BUTTON SOS TRIGGERED";
          tele.incidentPri = "P1-EMERGENCY";
        }
      }
    }
  }
}

// ================= DYNAMIC TFT METRICS UPDATE =================
void updateTftMetrics() {
  tft.setTextSize(1);

  // Network Health Panel
  tft.fillRect(6, 38, 148, 11, COLOR_BG);
  tft.setTextColor(tele.netColor);
  tft.setCursor(6, 39);
  tft.print(tele.netHealth);

  tft.setTextColor(COLOR_WHITE);
  tft.setCursor(95, 39);
  tft.print("LAT:");
  tft.print(tele.inferenceLatencyMs);
  tft.print("ms");

  // Incident Panel
  tft.fillRect(6, 70, 148, 22, COLOR_BG);
  tft.setTextColor(COLOR_WHITE);
  tft.setCursor(6, 71);
  tft.print("ID: ");
  tft.print(tele.incidentId);
  tft.setCursor(92, 71);
  tft.setTextColor(COLOR_AMBER);
  tft.print(tele.incidentPri);

  tft.setCursor(6, 82);
  tft.setTextColor(COLOR_CYAN);
  tft.print("STATUS: ");
  tft.setTextColor(COLOR_WHITE);
  tft.print(tele.incidentStatus);
}

// ================= NON-BLOCKING TICKER SCROLL =================
void renderTickerStep() {
  int textY = 114;
  int textPixelWidth = currentTickerMsg.length() * 6; // 6px per char

  // Clear previous ticker strip area
  tft.fillRect(0, textY - 1, 160, 10, COLOR_PANEL_BG);

  // Draw scrolling line
  tft.setTextWrap(false);
  tft.setTextSize(1);
  tft.setTextColor(COLOR_WHITE);
  tft.setCursor(tickerX, textY);
  tft.print(currentTickerMsg);

  tickerX -= 2; // Smooth speed step

  // Once scrolled off screen, advance to next message
  if (tickerX < -textPixelWidth) {
    tickerX = 160;
    tickerIndex = (tickerIndex + 1) % tickerTotal;
    currentTickerMsg = tickerFeed[tickerIndex];
  }
}

// ================= OLED #1: COMPACT FIELD TELEMETRY =================
void updateOledMetrics() {
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  // Row 1: Header & Health
  oled.setCursor(0, 0);
  oled.print("FLD-01 | ");
  oled.println(tele.netHealth);
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Row 2: GPS Status
  oled.setCursor(0, 14);
  oled.print("GPS: ");
  oled.println(tele.gpsStatus);

  // Row 3: NXP Link
  oled.setCursor(0, 24);
  oled.print("MCU: ");
  oled.println(tele.nxpLinkStatus);

  // Row 4: Incident ID & Priority
  oled.setCursor(0, 34);
  oled.print("EVT: ");
  oled.print(tele.incidentId);
  oled.print(" ");
  oled.println(tele.incidentPri);

  // Row 5: Real Queue & ACK Delivery Tracking
  oled.setCursor(0, 44);
  oled.print("QUEUE: ");
  oled.print(tele.pendingQueue);
  oled.print(" | ACK'D: ");
  oled.println(tele.ackedCount);

  // Row 6: Bottom Laya/AI snippet
  oled.drawLine(0, 53, 127, 53, SSD1306_WHITE);
  oled.setCursor(0, 56);
  oled.print("AI: ");
  oled.println(tele.incidentStatus);

  oled.display();
}
