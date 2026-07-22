const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3"

export function createNotificationSound() {
  const sound = new Audio(NOTIFICATION_SOUND_PATH)
  sound.preload = "auto"

  return sound
}

export function playNotificationSound(sound: HTMLAudioElement) {
  sound.currentTime = 0
  void sound.play().catch(() => {
    console.warn("Failed to play notification sound. User interaction may be required.")
  })
}

export function disposeNotificationSound(sound: HTMLAudioElement) {
  sound.pause()
  sound.removeAttribute("src")
  sound.load()
}
