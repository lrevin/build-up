// 음성 안내(TTS): 보고를 제출했을 때, 새 보고·검토 결과 알림이 왔을 때 소리로 읽어 준다
// 안드로이드 기본 음성 엔진(android/.../TtsModule.kt)을 쓴다. 내 정보에서 끄고 켤 수 있다(기본 켜짐)
import { NativeModules } from 'react-native';
import { ttsStore } from './data/storage';

const native = NativeModules.BuildUpTts as
  | { speak: (text: string) => void; stop: () => void }
  | undefined;

let enabled = true;
ttsStore.load().then(v => {
  enabled = v;
});

export const tts = {
  isEnabled: () => enabled,
  setEnabled(next: boolean) {
    enabled = next;
    ttsStore.save(next);
    if (!next) {
      native?.stop();
    }
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
