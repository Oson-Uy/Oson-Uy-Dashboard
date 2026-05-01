import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
    const locales = ['uz', 'ru'];
    const cookieStore = await cookies();
    let locale = cookieStore.get("oson_uy_dash_locale")?.value || 'ru';

    if (!locales.includes(locale)) {
        locale = "ru";
    }

    return {
        locale,
        messages: (await import(`../langs/${locale}.json`)).default
    };
});
