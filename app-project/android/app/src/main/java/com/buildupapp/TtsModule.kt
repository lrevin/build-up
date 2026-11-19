package com.buildupapp

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

/**
 * 음성 안내(TTS): 안드로이드 기본 음성 엔진으로 한국어 문장을 읽어 준다.
 * JS에서는 src/tts.ts 의 speak()로 부른다. 엔진이 준비되기 전에 온 문장은 준비되면 읽는다.
 */
class TtsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context), TextToSpeech.OnInitListener {

  private var tts: TextToSpeech? = null
  private var ready = false
  private var pending: String? = null

  override fun getName() = "BuildUpTts"

  private fun engine(): TextToSpeech =
    tts ?: TextToSpeech(reactApplicationContext, this).also { tts = it }

  override fun onInit(status: Int) {
    if (status != TextToSpeech.SUCCESS) return
    tts?.language = Locale.KOREAN
    ready = true
    pending?.let { say(it) }
    pending = null
  }

  private fun say(text: String) {
    // 앞 문장을 끊고 새 문장을 읽는다(알림이 연달아 와도 겹치지 않게)
    engine().speak(text, TextToSpeech.QUEUE_FLUSH, null, "buildup-${System.currentTimeMillis()}")
  }

  @ReactMethod
  fun speak(text: String) {
    if (text.isBlank()) return
    engine()
    if (ready) say(text) else pending = text
  }

  @ReactMethod
  fun stop() {
    tts?.stop()
  }

  override fun invalidate() {
    tts?.shutdown()
    tts = null
    ready = false
    super.invalidate()
  }
}
