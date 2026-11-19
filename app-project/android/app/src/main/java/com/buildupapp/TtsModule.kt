package com.buildupapp

import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

/**
 * 음성 안내(TTS): 안드로이드 기본 음성 엔진으로 한국어 문장을 읽어 준다.
 * - 목소리: 한국어 목소리 중 가장 자연스러운 것(신경망 '서버' 음성 > 품질 높은 순)을 자동으로 고르고,
 *   setVoice로 직접 고를 수도 있다. 서버 음성은 인터넷이 없으면 엔진이 기기 음성으로 대신 읽는다.
 * - 말투: 기본보다 살짝 느리게(0.95) 읽어 사람 말처럼 들리게 한다.
 * JS에서는 src/tts.ts 로 부른다. 엔진이 준비되기 전에 온 문장은 준비되면 읽는다.
 */
class TtsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context), TextToSpeech.OnInitListener {

  private var tts: TextToSpeech? = null
  private var ready = false
  private var pending: String? = null
  private var wantedVoice: String? = null // null = 자동

  override fun getName() = "BuildUpTts"

  private fun engine(): TextToSpeech =
    tts ?: TextToSpeech(reactApplicationContext, this).also { tts = it }

  override fun onInit(status: Int) {
    if (status != TextToSpeech.SUCCESS) return
    val t = tts ?: return
    t.language = Locale.KOREAN
    t.setSpeechRate(0.95f)
    t.setPitch(1.0f)
    applyVoice()
    ready = true
    pending?.let { say(it) }
    pending = null
  }

  private fun koreanVoices(): List<Voice> =
    try {
      tts?.voices.orEmpty().filter {
        it.locale.language == "ko" &&
          !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
      }
    } catch (e: Exception) {
      emptyList()
    }

  // 자연스러운 순서: 신경망 서버 음성 → 품질 → 응답 속도
  private fun bestVoice(): Voice? =
    koreanVoices().sortedWith(
      compareByDescending<Voice> { it.isNetworkConnectionRequired }
        .thenByDescending { it.quality }
        .thenBy { it.latency },
    ).firstOrNull()

  private fun applyVoice() {
    val t = tts ?: return
    val pick = wantedVoice?.let { name -> koreanVoices().firstOrNull { it.name == name } } ?: bestVoice()
    if (pick != null) t.voice = pick
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

  /** 고를 수 있는 한국어 목소리: [{ name, quality, network }] (자연스러운 순) */
  @ReactMethod
  fun getVoices(promise: Promise) {
    engine()
    val list = Arguments.createArray()
    koreanVoices()
      .sortedWith(compareByDescending<Voice> { it.isNetworkConnectionRequired }.thenByDescending { it.quality })
      .forEach {
        val m = Arguments.createMap()
        m.putString("name", it.name)
        m.putInt("quality", it.quality)
        m.putBoolean("network", it.isNetworkConnectionRequired)
        list.pushMap(m)
      }
    promise.resolve(list)
  }

  /** 목소리 고르기(null 또는 빈 값 = 자동) */
  @ReactMethod
  fun setVoice(name: String?) {
    wantedVoice = name?.takeIf { it.isNotBlank() }
    if (ready) applyVoice()
  }

  override fun invalidate() {
    tts?.shutdown()
    tts = null
    ready = false
    super.invalidate()
  }
}
