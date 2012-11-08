/*global io loadTemplate async*/
$().ready(function () {
  "use strict";

  window.document.title = 'motherlover™'

  var elements = {}
  var layersById = {}
  var layersArray = []
  var selectedLayer = null
  var socket = io.connect()
  var canvasElement = $('#canvas')

  socket.on('currentDocumentChanged', function (data) {
    window.document.title = 'motherlover™ / ' + data.split('/').pop()
    document.location.hash = data
  })

  socket.on('toolChanged', function (data) {})
  socket.on('fontList', function (fontList) {})

  socket.on('layers', function (layers) {
    purgeLayers(layers)
    layersArray = layers
    layers.forEach(function updateDOM(layer) {
      // skip empty text layers
      if (layer.kind === 'LayerKind.TEXT' && layer.textContent === '') return

      var element = updateLayerElement(elements[layer.id], layer)
      if (!element.parent().length) {
        elements[layer.id] = element.appendTo(canvasElement)
      }
      layersById[layer.id] = layer
    })
  })

  socket.on('layerPngReady', function (layerId) {
    elements[layerId].css({
      backgroundColor: 'transparent',
      backgroundImage: 'url("images/layers/' + layersById[layerId].name + '")'
    })
  })

  socket.emit('ready')

  function purgeLayers(newLayerSet) {
    var ids = newLayerSet.map(function (layer) { return layer.id })

    layersArray.forEach(function (layer) {
      // skip empty text layers
      if (layer.kind === 'LayerKind.TEXT' && layer.textContent === '') return

      var layerId = layer.id

      if (ids.indexOf(layerId) === -1 || isFormatChanged(layer)) {
        elements[layerId].remove()
        ;delete elements[layerId]
      }
    })
  }

  function isFormatChanged(layer) {
    var element = elements[layer.id]
    var className = layer.kind.replace('LayerKind.', '').toLowerCase()
    return (element !== undefined && !element.hasClass(className))
  }

  function updateLayerElement(element, layer) {
    var styles = {
      left: layer.bounds[0] + 'px',
      top: layer.bounds[1] + 'px',
      width: (layer.bounds[2] - layer.bounds[0])  + 'px',
      height: (layer.bounds[3] - layer.bounds[1])  + 'px',
      display: layer.isVisible ? 'block' : 'none',
      zIndex: layer.index,
      opacity: layer.opacity / 100
    }

    switch (layer.kind) {
      case 'LayerKind.TEXT':
        styles.width = (parseInt(styles.width, 10) + 10) + 'px'
        element = element || $('<div id="ml-' + layer.id + '" class="text"></div>')
        element.empty().append(createParagraphs(layer))
        element.css(styles)
        break
      case 'LayerKind.SOLIDFILL':
        styles.backgroundColor = layer.fillColor
        element = element || $('<div id="ml-' + layer.id + '" class="solidfill"></div>')
        createDropShadow(styles, layer)
        element.css(styles)
        break
      case 'LayerKind.NORMAL':
        styles.backgroundColor = 'transparent'
        styles.backgroundImage = 'url("images/layers/' + layer.name + '")'
        element = element || $('<div id="ml-' + layer.id + '" class="normal"></div>')
        element.css(styles)
        break
    }

    return element
  }

  function createParagraphs(layer) {
    var textStyles = layer.textStyles.slice(0)
    var textContent = layer.textContent
    var paragraphs = layer.paragraphStyles.map(function (paragraphStyle) {
      var spans = createSpansForParagraphs(textStyles, paragraphStyle.from, paragraphStyle.to, textContent, layer.transform)
      var p = $('<p>').css({
        textAlign: paragraphStyle.align,
        webkitHyphens: 'auto'
      }).append(spans)

      return p[0]
    })

    return paragraphs
  }

  function createSpansForParagraphs(textStyles, from, to, textContent, transform) {
    var textStyle, spanText, css, spans = []
    var stylesRanges = []

    for (var i = 0, l = textStyles.length; i < l; i++) {
      textStyle = textStyles[i]

      // hack related to https://github.com/kilianc/motherlover/issues/33
      if (stylesRanges.indexOf(textStyle.from + ':' + textStyle.to) !== -1) continue
      stylesRanges.push(textStyle.from + ':' + textStyle.to)

      if (textStyle.to < from) continue
      if (textStyle.from > to) break

      spanText = textContent.substring(Math.max(textStyle.from, from), Math.min(textStyle.to, to)).replace('\n', '<br>')

      if (transform && transform.xx.toFixed(2) === transform.yy.toFixed(2)) {
        textStyle.size = Math.abs(Math.round(textStyle.size * transform.xx))
      }

      css = {
        font: textStyle.size + 'px "' + textStyle.fontPostScriptName + '"',
        color: textStyle.color
      }

      css.lineHeight = textStyle.leading + 'px'
      css.letterSpacing = (6 * textStyle.tracking / 200) + 'px'

      if (textStyle.underline === 'underlineOnLeftInVertical') {
        css.textDecoration = 'underline'
      }

      if (textStyle.strikethrough === 'xHeightStrikethroughOn') {
        css.textDecoration = css.textDecoration ? css.textDecoration + ' line-through' : 'line-through'
      }

      if (textStyle.fontCaps === 'allCaps') {
        css.textTransform = 'uppercase'
      } else if (textStyle.fontCaps === 'smallCaps') {
        css.fontVariant = 'small-caps'
      }

      spans.push($('<span>').text(spanText).css(css)[0])
    }

    return spans
  }

  function createDropShadow(styles, layer) {
    if (!layer.layerStyles || !layer.layerStyles.dropShadow) {
      styles.boxShadow = 'none'
      return
    }

    var dropShadowData = layer.layerStyles.dropShadow
    var angle = (180 - (dropShadowData.useGlobalAngle ? dropShadowData.globalAngle : dropShadowData.localLightingAngle)) * Math.PI / 180
    var x = Math.round(Math.cos(angle) * dropShadowData.distance)
    var y = Math.round(Math.sin(angle) * dropShadowData.distance)
    var chokeMatte = dropShadowData.size * dropShadowData.chokeMatte / 100
    var blur = dropShadowData.size - chokeMatte
    var rgb = dropShadowData.color
    var rgba = 'rgba(' + parseInt(rgb.slice(1, 3), 16) + ', ' + parseInt(rgb.slice(3, 5), 16) + ', ' + parseInt(rgb.slice(5, 7), 16) + ', ' + dropShadowData.opacity / 100 + ')'

    styles.boxShadow = x + 'px ' + y + 'px ' + blur + 'px ' + chokeMatte + 'px ' + rgba
    alert(styles.boxShadow)
  }
})