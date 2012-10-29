﻿function getLayerData(doc, layer) {
  var layerData = {
    id: layer.id,
    name: layer.name,
    kind: layer.kind.toString(),
    bounds: [layer.bounds[0].as('px'), layer.bounds[1].as('px'), layer.bounds[2].as('px'), layer.bounds[3].as('px')],
    opacity: layer.opacity,
    isVisible: layer.visible,
    index: layer.itemIndex,
    isSelected: doc.activeLayer == layer
  }

  if (layerData.kind === 'LayerKind.TEXT') {
    var textKey = getLayerAttr(layer, {sid2tid.textKey}).getObjectValue({sid2tid.textKey})
    layerData.textContent = textKey.getString({sid2tid.textKey})

    if (layerData.textContent) {
      // expose matrix if exists
      if (textKey.hasKey({sid2tid.transform})) {
        var transformDescriptor = textKey.getObjectValue({sid2tid.transform})
        layerData.transform = {
          xx: transformDescriptor.getDouble({sid2tid.xx}),
          xy: transformDescriptor.getDouble({sid2tid.xy}),
          yx: transformDescriptor.getDouble({sid2tid.yx}),
          yy: transformDescriptor.getDouble({sid2tid.yy}),
          tx: transformDescriptor.getDouble({sid2tid.tx}),
          ty: transformDescriptor.getDouble({sid2tid.ty})
        }
      } else {
        layerData.transform = false
      }
      // styles
      layerData.textStyles = textStyleRangeToArray(textKey.getList({sid2tid.textStyleRange}))
      layerData.paragraphStyles = paragraphStyleRangeToArray(textKey.getList({sid2tid.paragraphStyleRange}))
    }
  } else if (layerData.kind === 'LayerKind.SOLIDFILL') {
    layerData.fillColor = getFillLayerColor(layer)
  }

  return layerData
}

function getLayerAttr(layer, key) {
  var ref = new ActionReference()
  ref.putProperty(app.charIDToTypeID('Prpr'), key)
  ref.putIndex(app.charIDToTypeID('Lyr '), layer.itemIndex)
  return executeActionGet(ref)
}

function textStyleRangeToArray(textStyleRange) {
  var styleRange, textStyle, textStyles = []

  for (var i = 0, l = textStyleRange.count; i < l; i++) {
    styleRange = textStyleRange.getObjectValue(i)
    textStyle = styleRange.getObjectValue({sid2tid.textStyle})
    textStyles.push({
      from: styleRange.getInteger({sid2tid.from}),
      to: styleRange.getInteger({sid2tid.to}),
      fontPostScriptName: textStyle.getString({sid2tid.fontPostScriptName}),
      fontName: textStyle.getString({sid2tid.fontName}),
      size: Math.round(textStyle.getDouble({sid2tid.size})),
      horizontalScale: textStyle.hasKey({sid2tid.horizontalScale}) ? Math.round(textStyle.getDouble({sid2tid.horizontalScale})) : 0,
      verticalScale: textStyle.hasKey({sid2tid.verticalScale}) ? Math.round(textStyle.getDouble({sid2tid.verticalScale})) : 0,
      syntheticBold: textStyle.hasKey({sid2tid.syntheticBold}) ? Boolean(textStyle.getBoolean({sid2tid.syntheticBold})) : false,
      syntheticItalic: textStyle.hasKey({sid2tid.syntheticItalic}) ? Boolean(textStyle.getBoolean({sid2tid.syntheticItalic})) : false,
      autoLeading: textStyle.hasKey({sid2tid.autoLeading}) ? Boolean(textStyle.getBoolean({sid2tid.autoLeading})) : true,
      leading: textStyle.hasKey({sid2tid.leading}) ? textStyle.getInteger({sid2tid.leading}) : 'auto',
      tracking: textStyle.hasKey({sid2tid.tracking}) ? textStyle.getInteger({sid2tid.tracking}) : 0,
      baselineShift: textStyle.hasKey({sid2tid.baselineShift}) ? textStyle.getInteger({sid2tid.baselineShift}) : 0,
      autoKern: textStyle.hasKey({sid2tid.autoKern}) ? enumMap[textStyle.getEnumerationValue({sid2tid.autoKern})] : 'metricsKern',
      fontCaps: textStyle.hasKey({sid2tid.fontCaps}) ? enumMap[textStyle.getEnumerationValue({sid2tid.fontCaps})] : 'normal',
      baseline: textStyle.hasKey({sid2tid.baseline}) ? enumMap[textStyle.getEnumerationValue({sid2tid.baseline})] : 'normal',
      strikethrough: textStyle.hasKey({sid2tid.strikethrough}) ? enumMap[textStyle.getEnumerationValue({sid2tid.strikethrough})] : 'strikethroughOff',
      underline: textStyle.hasKey({sid2tid.underline}) ? enumMap[textStyle.getEnumerationValue({sid2tid.underline})] : 'underlineOff',
      color: colorDescriptorToHexColor(textStyle.getObjectValue({sid2tid.color}))
    })
  }

  return textStyles
}

function paragraphStyleRangeToArray(paragraphStyleRange) {
  var paragraphRange, paragraphStyle, paragraphStyles = []

  for (var i = 0, l = paragraphStyleRange.count; i < l; i++) {
    paragraphRange = paragraphStyleRange.getObjectValue(i)
    paragraphStyle = paragraphRange.getObjectValue({sid2tid.paragraphStyle})
    paragraphStyles.push({
      from: paragraphRange.getInteger({sid2tid.from}),
      to: paragraphRange.getInteger({sid2tid.to}),
      align: paragraphStyle.hasKey({sid2tid.align}) ? enumMap[paragraphStyle.getEnumerationValue({sid2tid.align})] : 'left',
      hyphenate: paragraphStyle.hasKey({sid2tid.hyphenate}) ? Boolean(paragraphStyle.getBoolean({sid2tid.hyphenate})) : true,
      firstLineIndent: paragraphStyle.hasKey({sid2tid.firstLineIndent}) ? paragraphStyle.getInteger({sid2tid.firstLineIndent}) : 0,
      startIndent: paragraphStyle.hasKey({sid2tid.startIndent}) ? paragraphStyle.getInteger({sid2tid.startIndent}) : 0,
      endIndent: paragraphStyle.hasKey({sid2tid.endIndent}) ? paragraphStyle.getInteger({sid2tid.endIndent}) : 0,
      spaceBefore: paragraphStyle.hasKey({sid2tid.spaceBefore}) ? paragraphStyle.getInteger({sid2tid.spaceBefore}) : 0,
      spaceAfter: paragraphStyle.hasKey({sid2tid.spaceAfter}) ? paragraphStyle.getInteger({sid2tid.spaceAfter}) : 0
    })
  }

  return paragraphStyles
}

function getFillLayerColor(layer) {
  var key = app.charIDToTypeID('Adjs')
  var layerDesc = getLayerAttr(layer, key)
  var adjDesc = layerDesc.getList(key).getObjectValue(0)
  var clrDesc = adjDesc.getObjectValue(app.charIDToTypeID('Clr '))

  var color = new SolidColor()
  color.rgb.red = clrDesc.getDouble(app.charIDToTypeID('Rd  '))
  color.rgb.green = clrDesc.getDouble(app.charIDToTypeID('Grn '))
  color.rgb.blue = clrDesc.getDouble(app.charIDToTypeID('Bl  '))

  return '#' + color.rgb.hexValue
}

function colorDescriptorToHexColor(colorDescriptor) {
  var color = new SolidColor()
  color.rgb.red = colorDescriptor.getInteger({sid2tid.red})
  color.rgb.green = colorDescriptor.getInteger({sid2tid.green})
  color.rgb.blue = colorDescriptor.getInteger({sid2tid.blue})
  return '#' + color.rgb.hexValue
}