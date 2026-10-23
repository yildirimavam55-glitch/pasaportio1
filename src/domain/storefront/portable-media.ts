/** Retain unavailable original pointers in CMS/history, but never request Lovable-host-only URLs. */
export function portableMediaUrl(value:string|undefined):string|undefined{
 if(!value||value.includes('/__l5e/')||/^https?:\/\/[^/]*lovable\.(?:dev|app)\//i.test(value))return undefined;
 return value;
}
