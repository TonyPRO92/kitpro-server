from fastapi import Request
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from rembg import remove
from PIL import Image

async def handler(request: Request):
    try:
        body = await request.json()
        b64 = body.get('image')
        if not b64:
            return JSONResponse({"error": "no image"}, status_code=400)
        
        img_data = base64.b64decode(b64)
        input_img = Image.open(BytesIO(img_data))
        
        output_img = remove(input_img)
        
        buf = BytesIO()
        output_img.save(buf, format="PNG")
        out_b64 = base64.b64encode(buf.getvalue()).decode()
        
        return JSONResponse({"image": f"data:image/png;base64,{out_b64}"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Para Vercel
def handler_py(req):
    import asyncio
    return asyncio.run(handler(req))
