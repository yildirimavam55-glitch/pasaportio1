/** No draft may overwrite/unpublish a published legacy row or become publicly readable. */
export function assertLegacyCmsWritable():void{throw new Error('E_LEGACY_CMS_WRITE_PAUSED: Güvenli taslak geçişi için ayrı veritabanı onayı gerekir. V2 editörünü kullanın.');}
