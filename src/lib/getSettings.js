let settingsCache = null;
let lastFetch = 0;
const CACHE_TTL = 1000 * 60 * 15;

export async function getAppSetting(supabaseClient, key) {
  const now = Date.now();

  if (!settingsCache || now - lastFetch > CACHE_TTL) {
    console.log(
      `\n[getAppSetting] >>> Buscando app_settings no Supabase (key solicitada: ${key})`,
    );

    const { data, error, status, statusText } = await supabaseClient
      .from("app_settings")
      .select("key, value");

    console.log("[getAppSetting] HTTP status:", status, statusText);
    console.log(
      "[getAppSetting] error:",
      error ? JSON.stringify(error, null, 2) : "null",
    );
    console.log("[getAppSetting] data:", JSON.stringify(data, null, 2));

    if (!error && data) {
      settingsCache = data.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      lastFetch = now;
      console.log(
        "[getAppSetting] cache montado:",
        JSON.stringify(settingsCache, null, 2),
      );
    } else {
      console.log(
        "[getAppSetting] NÃO atualizou cache — error presente ou data nula/vazia.",
      );
    }
  } else {
    console.log(`[getAppSetting] usando cache já existente para key="${key}"`);
  }

  const cachedValue = settingsCache?.[key];
  const envValue = process.env[key];

  console.log(
    `[getAppSetting] RESULTADO key="${key}" -> cache=${JSON.stringify(cachedValue)} | env=${envValue ? "(definido, oculto)" : "undefined"}`,
  );

  return cachedValue || envValue;
}
