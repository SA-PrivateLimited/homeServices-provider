package com.homeservices.providerapp

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

class HoverableViewManager : ViewGroupManager<HoverableView>() {
  override fun getName() = "HoverableView"

  override fun createViewInstance(reactContext: ThemedReactContext): HoverableView {
    return HoverableView(reactContext)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.builder<String, Any>()
      .put("topHoverIn", MapBuilder.of("registrationName", "onHoverIn"))
      .put("topHoverOut", MapBuilder.of("registrationName", "onHoverOut"))
      .build()
  }
}
