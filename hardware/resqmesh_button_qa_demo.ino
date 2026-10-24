/*
 * RESq Mesh — Push-button Q&A demo for judges
 *
 * Hardware:
 *   ESP32 + 1.8-inch ST7735 SPI TFT + SSD1306 128x64 OLED + momentary button
 * Existing display wiring:
 *   TFT: CS=13, DC=27, RST=25, SCLK=18, MOSI=23
 *   OLED: SDA=21, SCL=22, address=0x3C
 *   Button: GPIO 32 to GND (INPUT_PULLUP)
 *
 * Install: Adafruit GFX, Adafruit ST7735 and ST7789, Adafruit SSD1306.
 *
 * This is a deterministic, preloaded Q&A showcase so the physical demo is
 * reliable offline. It does NOT call Gemma/Ollama live. Answers/source labels
 * are curated from README.md; the last card demonstrates an out-of-scope UI.
 */
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <Adafruit_SSD1306.h>

#define TFT_CS 13
#define TFT_RST 25
#define TFT_DC 27
#define TFT_SCLK 18
#define TFT_MOSI 23
#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDR 0x3C
#define BUTTON_PIN 32

#define C_BG 0x0000
#define C_PANEL 0x10A2
#define C_CYAN 0x07FF
#define C_GREEN 0x07E0
#define C_RED 0xF800
#define C_WHITE 0xFFFF
#define C_MUTED 0x9CF3

Adafruit_ST7735 tft(TFT_CS, TFT_DC, TFT_RST);
Adafruit_SSD1306 oled(128, 64, &Wire, -1);

struct QACard {
  const char *question;
  const char *answer;
  const char *source;
  const char *status;
  uint16_t accent;
};

const QACard cards[] = {
  {"What is RESq Mesh?", "An offline-first triage and telemetry system for hospitals and disaster sites when networks fail.", "README > Overview", "GROUNDED", C_CYAN},
  {"How does the NXP TinyML node help?", "A quantized INT8 model predicts wireless-link degradation so the system can prepare a fallback path.", "README > Edge AI", "GROUNDED", C_GREEN},
  {"What happens when the LLM is offline?", "The backend can fall back to a rule-based triage plan instead of depending entirely on the language model.", "README > Quickstart", "GROUNDED", C_CYAN},
  {"How is case data verified?", "Case capsules use HMAC-SHA256 signatures. The backend verifies signatures and flags conflicts during merge.", "README > Capsule security", "GROUNDED", C_GREEN},
  {"What does Laya decide?", "The rule-based decision layer returns a triage level, protocol, urgency and severity score.", "README > Triage and merge services", "GROUNDED", C_CYAN},
  {"What is the capital of France?", "I cannot answer that from RESq Mesh documentation. Ask a project maintainer or consult a general reference.", "No relevant project evidence", "OUT OF SCOPE", C_RED}
};
const uint8_t CARD_COUNT = sizeof(cards) / sizeof(cards[0]);
uint8_t currentCard = 0;
bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceAt = 0;
const unsigned long DEBOUNCE_MS = 35;

void drawWrappedText(int16_t x, int16_t y, const char *text, uint16_t color,
                     uint8_t size, uint8_t maxCharsPerLine, uint8_t maxLines) {
  tft.setTextSize(size);
  tft.setTextColor(color, C_BG);
  tft.setCursor(x, y);
  uint8_t line = 0, col = 0;
  const char *p = text;
  while (*p && line < maxLines) {
    if (*p == ' ' && col >= maxCharsPerLine) {
      tft.println(); line++; col = 0;
      while (*(p + 1) == ' ') p++;
      p++;
      continue;
    }
    tft.write(*p++);
    col++;
    if (col >= maxCharsPerLine && *p) { tft.println(); line++; col = 0; }
  }
  if (*p) { tft.setTextColor(C_MUTED, C_BG); tft.print("..."); }
}

void drawTFTCard() {
  const QACard &card = cards[currentCard];
  tft.fillScreen(C_BG);
  tft.fillRect(0, 0, 160, 17, C_PANEL);
  tft.setTextSize(1); tft.setTextColor(C_CYAN, C_PANEL);
  tft.setCursor(5, 5); tft.print("RESQ MESH  //  FIELD AI");
  tft.drawFastHLine(0, 19, 160, card.accent);
  tft.setTextColor(card.accent, C_BG); tft.setCursor(5, 24);
  tft.print("Q"); tft.print(currentCard + 1); tft.print("/"); tft.print(CARD_COUNT); tft.print(" QUESTION");
  drawWrappedText(5, 37, card.question, C_WHITE, 1, 25, 2);
  tft.drawFastHLine(5, 61, 150, 0x4208);
  tft.setTextColor(card.accent, C_BG); tft.setCursor(5, 67); tft.print("ANSWER");
  drawWrappedText(5, 79, card.answer, C_WHITE, 1, 25, 3);
  tft.drawFastHLine(5, 111, 150, 0x4208);
  tft.setTextColor(C_MUTED, C_BG); tft.setCursor(5, 116); tft.print("SRC: ");
  if (currentCard == 3) tft.print("README / SECURITY");
  else if (currentCard == 4) tft.print("README / LAYA");
  else if (currentCard == 5) tft.print("NO DOC EVIDENCE");
  else if (currentCard == 2) tft.print("README / QUICKSTART");
  else if (currentCard == 1) tft.print("README / EDGE AI");
  else tft.print("README / OVERVIEW");
}

void drawOLEDStatus() {
  const QACard &card = cards[currentCard];
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.setTextSize(1); oled.setCursor(0, 0);
  oled.println(F("RESQ MESH // DEMO")); oled.println(F("----------------"));
  oled.print(F("CARD: ")); oled.print(currentCard + 1); oled.print('/'); oled.println(CARD_COUNT);
  oled.print(F("RAG: ")); oled.println(currentCard == CARD_COUNT - 1 ? F("NO EVIDENCE") : F("MATCH"));
  oled.print(F("LAYA: ")); oled.println(card.status);
  oled.println(F("----------------")); oled.println(F("PRESS BTN: NEXT")); oled.display();
}

void showCard() {
  drawTFTCard(); drawOLEDStatus();
  Serial.print(F("CARD=")); Serial.print(currentCard + 1); Serial.print('/'); Serial.print(CARD_COUNT);
  Serial.print(F(" | STATUS=")); Serial.print(cards[currentCard].status);
  Serial.print(F(" | QUESTION=")); Serial.println(cards[currentCard].question);
}

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP); Serial.begin(115200);
  SPI.begin(TFT_SCLK, -1, TFT_MOSI, TFT_CS);
  tft.initR(INITR_BLACKTAB); tft.setRotation(1); tft.fillScreen(C_BG);
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) Serial.println(F("WARN: OLED not found at 0x3C"));
  else {
    oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.setTextSize(1); oled.setCursor(0, 0);
    oled.println(F("RESQ MESH")); oled.println(F("Q&A DEMO BOOT")); oled.println(F("BUTTON: GPIO32")); oled.display();
  }
  delay(500); showCard();
}

void loop() {
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonReading) { lastDebounceAt = millis(); lastButtonReading = reading; }
  if ((millis() - lastDebounceAt) > DEBOUNCE_MS && reading != stableButtonState) {
    stableButtonState = reading;
    if (stableButtonState == LOW) { currentCard = (currentCard + 1) % CARD_COUNT; showCard(); }
  }
  delay(2);
}
