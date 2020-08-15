var localizationArray = {
    "LCODE_C1": "一級分類代碼",
    "LCODE_C2": "二級分類代碼",
    "LCODE_C3": "三級分類代碼",
    "county": "縣市別",
    "fixed_landid": "地號",
    "flag_tag": "旗標",
    "land_manger": "管理機關",
    "land_onwer": "所有權人",
    "name": "名稱",
    "origin_landid": "原地號",
    "origin_section": "原段名",
    "town": "區名",
    "up_zone": "修正區段",
    "up_zoning": "修正分區",
    "up_zoning_type": "分區類型"
};

var sidebar = new ol.control.Sidebar({
    element: 'sidebar',
    position: 'right'
});

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

closer.onclick = function() {
    popup.setPosition(undefined);
    closer.blur();
    return false;
};

var popup = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

var nlscMatrixIds = new Array(21);
for (var i = 0; i < 21; ++i) {
    nlscMatrixIds[i] = i;
}

var styleLines = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(86,113,228,0.7)',
        width: 3
    })
});

var styleAreas = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(86,113,228,0.7)',
        width: 3
    }),
    fill: new ol.style.Fill({
        color: 'rgba(86,113,228,0.3)',
    })
});

var vectorAreas = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'data/polygons.json',
        format: new ol.format.GeoJSON()
    }),
    style: styleAreas
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.5
});

var targetLayer;
var pointStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: [249, 157, 34, 0.7]
        })
    }),
    text: new ol.style.Text({
        font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
        fill: new ol.style.Fill({
            color: [215, 48, 39, 0.7]
        })
    })
});
var pointRedStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: [243, 0, 80, 0.7]
        })
    })
});
var pointGreenStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: [0, 243, 80, 0.7]
        })
    })
});

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.20345985889435, 22.994906062625773]),
    zoom: 14
});

var map = new ol.Map({
    layers: [baseLayer, vectorAreas],
    overlays: [popup],
    target: 'map',
    view: appView
});

map.addControl(sidebar);

var geolocation = new ol.Geolocation({
    projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
    console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
            color: '#3399CC'
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
        })
    })
}));

var geolocationCentered = false;
geolocation.on('change:position', function() {
    var coordinates = geolocation.getPosition();
    if (coordinates) {
        positionFeature.setGeometry(new ol.geom.Point(coordinates));
        if (false === geolocationCentered) {
            map.getView().setCenter(coordinates);
            geolocationCentered = true;
        }
    }
});

new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [positionFeature]
    })
});

map.on('singleclick', function(evt) {
    var sideBarOpened = false;
    $('#sidebar-main-block').html('');
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        var p = feature.getProperties();
        var message = '<table class="table table-dark table-bordered">';
        for (k in p) {
            if (k !== 'geometry') {
                message += '<tr><td>' + localizationArray[k] + '</td><td>' + p[k] + '</td></tr>';
            }
        }
        message += '</table>';
        $('#sidebar-main-block').html(message);
        sidebar.open('home');
    });
});

$('a.btnShowAll').click(function() {
    sidebar.close();
    var baseExtent = ol.extent.createEmpty();
    map.getLayers().forEach(function(layer) {
        if (layer instanceof ol.layer.Vector) {
            ol.extent.extend(baseExtent, layer.getSource().getExtent());
        }
    });
    map.getView().fit(baseExtent);

    for (k in riverLayers) {
        riverLayers[k].getSource().forEachFeature(function(f) {
            if (f.get('fType') === 'green') {
                f.setStyle(pointGreenStyle);
            } else {
                f.setStyle(pointRedStyle);
            }
        })
    }
    targetLayer.getSource().forEachFeature(function(f) {
        var fStyle = pointStyle.clone();
        fStyle.getText().setText(f.get('name'));
        f.setStyle(fStyle);
    });

    return false;
});

var emptyStyle = new ol.style.Style({
    image: ''
});