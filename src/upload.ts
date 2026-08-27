import { remarkable } from "rmapi-js";
import { lock } from "./lock";

// rmapi-js declares the api instance type but does not export it
type Remarkable = Awaited<ReturnType<typeof remarkable>>;

const cacheLock = lock();
let cachedToken = "";
let cachedApi: Remarkable | undefined;

async function getApi(deviceToken: string): Promise<Remarkable> {
  if (cachedApi !== undefined && cachedToken === deviceToken) {
    return cachedApi;
  } else {
    try {
      await cacheLock.acquire();
      cachedToken = deviceToken;
      const api = await remarkable(deviceToken);
      cachedApi = api;
      return api;
    } finally {
      cacheLock.release();
    }
  }
}

export async function upload(
  epub: Uint8Array,
  title: string,
  deviceToken: string,
): Promise<void> {
  const api = await getApi(deviceToken);
  await api.uploadEpub(title, epub);
}
