export interface NotificationSettings {
  barkToken: string
  telegramBotToken: string
}

export const NOTIFICATION_SETTINGS_STORAGE_KEY = "allin1_notification_settings"

export const defaultNotificationSettings: NotificationSettings = {
  barkToken: "",
  telegramBotToken: "",
}
