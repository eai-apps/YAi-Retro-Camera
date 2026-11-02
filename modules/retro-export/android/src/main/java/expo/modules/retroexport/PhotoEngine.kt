package expo.modules.retroexport

import android.content.Context
import android.graphics.*
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.*

class PhotoEngine(private val context:Context,private val files:MediaFiles) {
    fun render(uris:List<String>,options:Map<String,Any?>):Map<String,Any> {
        val layout=options["layout"] as? String?:"single";require(layout in listOf("single","polaroid","strip","collage"))
        require(uris.isNotEmpty()&&uris.size<=4){"Для этой композиции выберите от одного до четырёх фото"}
        if(layout=="strip")require(uris.size==4){"Для фотобудки нужны четыре кадра"}
        if(layout in listOf("single","polaroid"))require(uris.size==1){"Выберите одно фото"}
        val preview=options["preview"]==true;val fx=FxConfig(if(layout=="polaroid")options+("frame" to 0)else options);val limit=if(preview)1280 else 4096
        val bitmap=if(layout in listOf("single","polaroid")){
            val decoded=decode(files.privateFile(uris[0]),limit)
            val ratio=when(options["aspect"]){"9:16"->9f/16;"16:9"->16f/9;"1:1"->1f;else->decoded.width.toFloat()/decoded.height}
            val cw=min(decoded.width,(decoded.height*ratio).roundToInt()).coerceAtLeast(1);val ch=min(decoded.height,(decoded.width/ratio).roundToInt()).coerceAtLeast(1)
            val image=if(cw!=decoded.width||ch!=decoded.height)Bitmap.createBitmap(decoded,(decoded.width-cw)/2,(decoded.height-ch)/2,cw,ch).also{if(it!==decoded)decoded.recycle()}else decoded
            grade(image,fx)
            if(layout=="polaroid"){
                val border=max(24,image.width/16);val out=Bitmap.createBitmap(image.width+border*2,image.height+border*5,Bitmap.Config.ARGB_8888)
                Canvas(out).apply{drawColor(Color.rgb(246,243,232));drawBitmap(image,border.toFloat(),border.toFloat(),null)};image.recycle();out
            }else image
        }else {
            val w=if(preview)720 else if(layout=="strip")1080 else 2160
            val gap=max(12,w/40);val columns=if(layout=="strip")1 else 2;val rows=ceil(uris.size.toDouble()/columns).toInt();val cell=(w-gap*(columns+1))/columns;val h=gap*(rows+1)+cell*rows+gap*2
            val out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);val canvas=Canvas(out);canvas.drawColor(Color.rgb(246,243,232))
            uris.forEachIndexed{i,uri->val source=decode(files.privateFile(uri),cell*2);grade(source,fx);val x=gap+(i%columns)*(cell+gap);val y=gap+(i/columns)*(cell+gap)
                val side=min(source.width,source.height);val crop=Rect((source.width-side)/2,(source.height-side)/2,(source.width+side)/2,(source.height+side)/2)
                canvas.drawBitmap(source,crop,Rect(x,y,x+cell,y+cell),Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG));source.recycle()};out
        }
        if(options["dateEnabled"]!=false)stamp(Canvas(bitmap),bitmap.width,bitmap.height,options,false)
        val temp=File(File(context.cacheDir,"retro_preview").apply{mkdirs()},"photo_${UUID.randomUUID()}.jpg")
        try {temp.outputStream().use{check(bitmap.compress(Bitmap.CompressFormat.JPEG,if(preview)86 else 96,it))};val width=bitmap.width;val height=bitmap.height;bitmap.recycle()
            val uri=if(preview)Uri.fromFile(temp) else files.save(temp,false)
            return mapOf("success" to true,"outputUri" to uri.toString(),"width" to width,"height" to height,"sizeBytes" to temp.length())
        }finally{if(!bitmap.isRecycled)bitmap.recycle();if(!preview)temp.delete()}
    }
    private fun decode(file:File,maxDimension:Int):Bitmap {
        val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeFile(file.path,bounds);require(bounds.outWidth>0){"Неверный формат фото"}
        val budget=min(20_000_000L,Runtime.getRuntime().maxMemory()/16)
        var sample=1;while(bounds.outWidth.toLong()*bounds.outHeight/(sample*sample)>budget||max(bounds.outWidth,bounds.outHeight)/sample>maxDimension)sample*=2
        val bitmap=BitmapFactory.decodeFile(file.path,BitmapFactory.Options().apply{inSampleSize=sample;inMutable=true;inPreferredConfig=Bitmap.Config.ARGB_8888})?:error("Не удалось открыть фото")
        val orientation=ExifInterface(file).getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL)
        val matrix=Matrix();when(orientation){2->matrix.setScale(-1f,1f);3->matrix.setRotate(180f);4->matrix.setScale(1f,-1f);5->{matrix.setRotate(90f);matrix.postScale(-1f,1f)};6->matrix.setRotate(90f);7->{matrix.setRotate(270f);matrix.postScale(-1f,1f)};8->matrix.setRotate(270f)}
        if(matrix.isIdentity)return bitmap
        val rotated=Bitmap.createBitmap(bitmap,0,0,bitmap.width,bitmap.height,matrix,true);if(rotated!==bitmap)bitmap.recycle();return if(rotated.isMutable)rotated else rotated.copy(Bitmap.Config.ARGB_8888,true).also{rotated.recycle()}
    }
    private fun grade(bitmap:Bitmap,fx:FxConfig){val row=IntArray(bitmap.width);for(y in 0 until bitmap.height){bitmap.getPixels(row,0,bitmap.width,0,y,bitmap.width,1);for(x in row.indices)row[x]=fx.pixel(row[x],x,y,bitmap.width,bitmap.height);bitmap.setPixels(row,0,bitmap.width,0,y,bitmap.width,1)}}
    companion object {
        fun stamp(canvas:Canvas,w:Int,h:Int,options:Map<String,Any?>,video:Boolean,timeUs:Long=0){val size=max(12f,w*.032f);val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(255,188,91);textSize=size;typeface=Typeface.MONOSPACE;setShadowLayer(size*.08f,1f,1f,Color.BLACK)}
            if(video&&options["showRec"]!=false){paint.color=Color.rgb(245,85,72);canvas.drawCircle(w*.06f,h*.06f,size*.18f,paint);paint.color=Color.WHITE;canvas.drawText("REC",w*.085f,h*.06f+size*.3f,paint)}
            if(options["dateEnabled"]!=false){val custom=(options["dateText"] as? String).orEmpty().take(48);val base=(options["baseTimeMs"] as? Number)?.toLong()?:System.currentTimeMillis();val text=custom.ifBlank{SimpleDateFormat("dd.MM.yyyy HH:mm:ss",Locale.ROOT).format(Date(base+timeUs/1000))};paint.color=Color.rgb(255,188,91);canvas.drawText(text,w*.06f,h*.94f,paint)}}
    }
}
