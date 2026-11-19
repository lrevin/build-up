// 음성 안내(TTS): 보고를 제출했을 때, 새 보고·검토 결과 알림이 왔을 때 소리로 읽어 준다
// 안드로이드 기본 음성 엔진(android/.../TtsModule.kt)을 쓴다. 내 정보에서 끄고 켤 수 있다(기본 켜짐)
import { NativeModules } from 'react-native';
import { ttsStore } from './data/storage';

export interface TtsVoice {
  name: string; // 엔진의 목소리 이름(예: ko-kr-x-ism-network)
  quality: number; // 높을수록 좋음
  network: boolean; // 신경망 서버 음성(가장 자연스러움, 인터넷 필요)
}

const native = NativeModules.BuildUpTts as
  | {
      speak: (text: string) => void;
      stop: () => void;
      getVoices: () => Promise<TtsVoice[]>;
      setVoice: (name: string | null) => void;
    }
  | undefined;

let enabled = true;
let voiceName: string | null = null; // null = 자동(가장 자연스러운 목소리)
ttsStore.load().then(v => {
  enabled = v;
});
ttsStore.loadVoice().then(v => {
  voiceName = v;
  native?.setVoice(v);
});

const wait = (ms: number) => new Promise<void>(r => setTimeout(() => r(), ms));

export const tts = {
  isEnabled: () => enabled,
  setEnabled(next: boolean) {
    enabled = next;
    ttsStore.save(next);
    if (!next) {
      native?.stop();
    }
  },
  voice: () => voiceName,
  setVoice(name: string | null) {
    voiceName = name;
    ttsStore.saveVoice(name);
    native?.setVoice(name);
  },
  /** 고를 수 있는 한국어 목소리(엔진이 막 켜지는 중이면 잠깐 기다렸다가 다시 물어본다) */
  async voices(): Promise<TtsVoice[]> {
    if (!native) {
      return [];
    }
    for (let i = 0; i < 6; i++) {
      const list = await native.getVoices().catch(() => []);
      if (list.length) {
        return list;
      }
      await wait(500);
    }
    return [];
  },
  speak(text: string) {
    if (!enabled || !native || !text.trim()) {
      return;
    }
    // '·' 같은 기호는 쉼표로 바꿔 자연스럽게 끊어 읽게
    native.speak(text.replace(/\s*[·→]\s*/g, ', '));
  },
};

/** 알림 제목(서버 Notices.java: "새 현장 보고 · 현장명" 등)으로 읽을 문장을 만든다. 읽을 알림이 아니면 null */
export function speechForPush(title: string, body: string): string | null {
  const [kind, ...rest] = title.split(' · ');
  const site = rest.join(' · ');
  const who = body.split(' · ')[0];
  switch (kind) {
    case '새 현장 보고':
      return `${site}에 새 보고가 들어왔어요. ${who}님의 보고예요.`;
    case '보완 완료':
      return `${site}, ${who}님이 보고를 보완해서 다시 올렸어요.`;
    case '보고 승인':
      return `${site} 보고가 승인됐어요.`;
    case '보완 요청':
      return `${site} 보고에 보완 요청이 왔어요.`;
    default:
      return null;
  }
}
