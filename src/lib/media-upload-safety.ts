/** New uploads are inert raster files. Existing SVG assets are retained; active SVG uploads are refused. */
export function validateImageUpload(bytes:Uint8Array,mime:string):'png'|'jpg'|'webp'|'avif'{
 if(bytes.length<12||bytes.length>10*1024*1024)throw new Error('E_MEDIA_SIZE');
 const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(mime==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'png';
 if(['image/jpeg','image/jpg'].includes(mime)&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217)return 'jpg';
 if(mime==='image/webp'&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'webp';
 if(mime==='image/avif'&&ascii(4,8)==='ftyp'&&['avif','avis'].includes(ascii(8,12)))return 'avif';
 throw new Error('E_MEDIA_TYPE_SIGNATURE');
}
