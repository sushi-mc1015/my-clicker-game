/**
 * サウンドマネージャー
 * エフェクトに応じた音声を再生する
 */

export interface SoundConfig {
  punchSound: string; // パンチ音のファイルパス
  bulletSound: string; // 銃撃音のファイルパス
}

// デフォルトのサウンド設定
const defaultConfig: SoundConfig = {
  punchSound: '/sounds/punch.mp3',
  bulletSound: '/sounds/bullet.mp3',
};

// サウンド設定（カスタマイズ可能）
let soundConfig: SoundConfig = defaultConfig;

/**
 * サウンド設定を更新する
 */
export const setSoundConfig = (config: Partial<SoundConfig>) => {
  soundConfig = { ...soundConfig, ...config };
};

/**
 * サウンド設定を取得する
 */
export const getSoundConfig = (): SoundConfig => {
  return soundConfig;
};

/**
 * 音声を再生する
 */
export const playSound = (soundPath: string) => {
  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.5; // 音量を50%に設定
    audio.play().catch((error) => {
      console.warn('Failed to play sound:', error);
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

/**
 * パンチ音を再生する
 */
export const playPunchSound = () => {
  playSound(soundConfig.punchSound);
};

/**
 * 銃撃音を再生する
 */
export const playBulletSound = () => {
  playSound(soundConfig.bulletSound);
};
