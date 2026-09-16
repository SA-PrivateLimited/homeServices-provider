package com.homeservices.providerapp

import android.content.Context
import android.view.MotionEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.facebook.react.views.view.ReactViewGroup

/** Fires JS hover in/out from Android mouse/stylus hover (not click). */
class HoverableView(context: Context) : ReactViewGroup(context) {
  override fun dispatchHoverEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_HOVER_ENTER -> emit("topHoverIn")
      MotionEvent.ACTION_HOVER_EXIT -> emit("topHoverOut")
    }
    return super.dispatchHoverEvent(event)
  }

  private fun emit(eventName: String) {
    if (id == NO_ID) return
    val reactContext = context as? ReactContext ?: return
    reactContext
      .getJSModule(RCTEventEmitter::class.java)
      .receiveEvent(id, eventName, Arguments.createMap())
  }
}
