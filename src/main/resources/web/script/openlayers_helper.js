function OpenLayersHelper(config) {

    var map                     // OpenLayers.Map object
    var feature_layers = {}     // Key: layer name, value: FeatureLayer object

    var map_projection          // OpenStreetMap projection is EPSG:900913
    var lonlat_projection = new OpenLayers.Projection("EPSG:4326")  // EPSG:4326 is lon/lat projection

    init()

    // ------------------------------------------------------------------------------------------------------ Public API

    this.render = function(container) {
        map.render(container)
    }

    this.add_feature = function(geo_facet) {
        feature_layers["features"].add_feature({lon: geo_facet.x, lat: geo_facet.y}, geo_facet)
    }

    this.clear = function() {
        feature_layers["features"].remove_all_features()
    }

    this.update_size = function() {
        map.updateSize()
    }

    // ---

    this.set_center = function(center, zoom) {
        map.setCenter(transform_to_map(center.lon, center.lat), zoom)
    }



    // ----------------------------------------------------------------------------------------------- Private Functions

    function init() {
        OpenLayers.ImgPath = "/de.deepamehta.geomaps/script/vendor/openlayers/img/"
        //
        map = new OpenLayers.Map({
            controls: []
        })
        map.addLayers([
            new OpenLayers.Layer.OSM("OpenSteetMap")
        ])
        map.addControl(new OpenLayers.Control.Navigation({'zoomWheelEnabled': false}))
        map.addControl(new OpenLayers.Control.ZoomPanel())
        map.events.register("moveend", undefined, on_move)
        map_projection = map.getProjectionObject()
        feature_layers["features"] = new FeatureLayer("features")

        function on_move() {
            var center = map.getCenter()
            config.move_handler(transform_to_lonlat(center.lon, center.lat), map.getZoom())
        }
    }

    // ---

    /**
     * Transforms lon/lat coordinates according to this map's projection.
     *
     * @param   lon     (float)
     * @param   lat     (float)
     *
     * @return  an OpenLayers.LonLat object
     */
    function transform_to_map(lon, lat) {
        return new OpenLayers.LonLat(lon, lat).transform(lonlat_projection, map_projection)
    }

    function transform_to_lonlat(lon, lat) {
        return new OpenLayers.LonLat(lon, lat).transform(map_projection, lonlat_projection)
    }



    // ------------------------------------------------------------------------------------------------- Private Classes

    /**
     * Wraps an OpenLayers vector layer and binds features to topics. Provides two methods:
     *     - add_feature(pos, topic)
     *     - remove_feature(topic_id)
     */
    function FeatureLayer(layer_name) {
        var features = {}   // holds the OpenLayers.Feature.Vector objects, keyed by topic ID
        var style = {
            fillColor: "#ff0000",
            fillOpacity: 0.4,
            strokeColor: "#000000",
            strokeOpacity: 1,
            pointRadius: 8
        }
        var vector_layer = new OpenLayers.Layer.Vector(layer_name, {style: style})
        var select = new OpenLayers.Control.SelectFeature(vector_layer, {onSelect: do_select_feature})
        map.addLayer(vector_layer)
        map.addControl(select)
        select.activate()

        // === Public API ===

        this.add_feature = function(pos, topic) {
            // remove feature if already on the map
            if (features[topic.id]) {
                vector_layer.removeFeatures([features[topic.id]])
            }
            // create feature
            var p = transform_to_map(pos.lon, pos.lat)
            var geometry = new OpenLayers.Geometry.Point(p.lon, p.lat)
            var feature = new OpenLayers.Feature.Vector(geometry, {topic_id: topic.id})
            features[topic.id] = feature
            vector_layer.addFeatures([feature])
        }

        this.remove_feature = function(topic_id) {
            vector_layer.removeFeatures([features[topic_id]])
            // ### TODO: delete from features object
        }

        this.remove_all_features = function() {
            vector_layer.removeAllFeatures()
        }

        // ---

        function do_select_feature(feature) {
            dm4c.do_select_topic(feature.attributes.topic_id)
        }

        function iterate_features(visitor_func) {
            for (var topic_id in features) {
                visitor_func(features[topic_id])
            }
        }
    }
}