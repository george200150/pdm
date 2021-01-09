import {Plugins} from "@capacitor/core";
import { getLogger } from '../core';

const { Storage } = Plugins;
const log = getLogger('core/etag-management');

export interface EtaggedResponse {
    etag: string;
    payload: any;
}

export async function saveEtaggedResponse(key: string, etag: string, payload: any) {
    key = `etag_${key}`;
    log(`saveEtaggedResponse - save ${key}`)
    const etaggedResponse: EtaggedResponse = { etag, payload };
    const value = JSON.stringify(etaggedResponse);
    await Storage.set({
        key: key,
        value: value
    });
}

export async function getEtaggedResponse(key: string): Promise<EtaggedResponse | void> {
    key = `etag_${key}`;
    log(`saveEtaggedResponse - get ${key}`)
    const value = await Storage.get({ key: key }).then(result => { return result.value; });
    if (value !== null) {
        return JSON.parse(value);
    }
}
