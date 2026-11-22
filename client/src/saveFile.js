// Zapis pliku (PDF, JSON, kalendarz .ics) w przeglądarce i w aplikacji na Androida.
// WebView nie obsługuje <a download> z blob: – w aplikacji zapisujemy plik w katalogu podręcznym
// i otwieramy systemowe „Udostępnij” (zapis w Plikach, wysłanie mailem, otwarcie w kalendarzu…).
import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function saveFile(blob, name) {
  if (isNativeApp()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    await Share.share({ title: name, files: [uri] });
    return;
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
