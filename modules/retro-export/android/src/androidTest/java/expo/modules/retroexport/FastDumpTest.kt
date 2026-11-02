package expo.modules.retroexport

import android.graphics.Rect
import android.os.Bundle
import android.util.Xml
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import java.io.StringWriter

/** Test APK only: snapshot the active window without waiting for a live timer to stop. */
@RunWith(AndroidJUnit4::class)
class FastDumpTest {
    @Test fun activeWindowSnapshot() {
        val instrumentation=InstrumentationRegistry.getInstrumentation()
        val automation=instrumentation.uiAutomation
        val deadline=android.os.SystemClock.elapsedRealtime()+5000
        var active=automation.rootInActiveWindow
        while(active==null&&android.os.SystemClock.elapsedRealtime()<deadline){
            android.os.SystemClock.sleep(100);active=automation.rootInActiveWindow
        }
        val root=active?:error("No active Android window")
        val screen=android.graphics.Point()
        (instrumentation.context.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager).defaultDisplay.getRealSize(screen)
        val screenBounds=Rect(0,0,screen.x,screen.y)
        val output=StringWriter();val xml=Xml.newSerializer()
        xml.setOutput(output);xml.startDocument("UTF-8",true)
        xml.startTag(null,"hierarchy");xml.attribute(null,"rotation","0")
        fun node(info:AccessibilityNodeInfo) {
            xml.startTag(null,"node")
            xml.attribute(null,"text",info.text?.toString().orEmpty())
            xml.attribute(null,"content-desc",info.contentDescription?.toString().orEmpty())
            xml.attribute(null,"resource-id",info.viewIdResourceName.orEmpty())
            xml.attribute(null,"class",info.className?.toString().orEmpty())
            xml.attribute(null,"package",info.packageName?.toString().orEmpty())
            xml.attribute(null,"enabled",info.isEnabled.toString())
            xml.attribute(null,"clickable",info.isClickable.toString())
            val bounds=Rect();info.getBoundsInScreen(bounds)
            if(!bounds.intersect(screenBounds))bounds.setEmpty()
            xml.attribute(null,"bounds","[${bounds.left},${bounds.top}][${bounds.right},${bounds.bottom}]")
            for(i in 0 until info.childCount) info.getChild(i)?.let { child->
                try{if(child.isVisibleToUser)node(child)}finally{child.recycle()}
            }
            xml.endTag(null,"node")
        }
        try{node(root)}finally{root.recycle()}
        xml.endTag(null,"hierarchy");xml.endDocument()
        instrumentation.sendStatus(0,Bundle().apply{putString("xml",output.toString())})
    }
}
