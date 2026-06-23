const FLASH_KEY = "buildx-flash";

export function setFlashMessage(message: string): void {
  sessionStorage.setItem(FLASH_KEY, message);
}

export function consumeFlashMessage(): string | null {
  const message = sessionStorage.getItem(FLASH_KEY);
  if (message) {
    sessionStorage.removeItem(FLASH_KEY);
  }
  return message;
}
