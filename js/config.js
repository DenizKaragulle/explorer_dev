var Config = {
	/******** Browser window title (text that will show up in the browser bookmarks) ********/
	"APP_TITLE":"USGS Archival Topographic Map Explorer",

	/******** Application header/banner ********/
	/* Header/Banner background color (rgb or hex) */
	"HEADER_HEIGHT": "70px",
	"APP_HEADER_BACKGROUND_COLOR":"#304b3c",
	/* Header text color */
	"APP_HEADER_TEXT_COLOR":"white",
	/* Header text size */
	"APP_HEADER_TEXT_SIZE":"1.6em",
	/* Header text */
	"APP_HEADER_TEXT":"USGS Archival Topographic Map Explorer",

	/* Header text color */
	"APP_SUBHEADER_TEXT_COLOR":"white",
	/* Header text size */
	"APP_SUBHEADER_TEXT_SIZE":"0.9em",
	/* Subheader text */
	"APP_SUBHEADER_TEXT":"",

	/* Step Messages */
	"STEP_ONE_MESSAGE":"<span style='font-weight: bold'>Go</span> to a location to the location you want to explore, then <br/><span style='font-weight: bold'>Click</span> on a place to see its historical maps.",
	"STEP_ONE_HALF_CIRCLE_MSG":"1",
	"STEP_THREE_MESSAGE":"<span style='font-weight: bold'>Slide</span> transparency on map to compare, or drag/drop to re-order maps.",
	"STEP_THREE_HALF_CIRCLE_MSG":"2",

	"HALF_CIRCLE_BACKGROUND_COLOR" : "#92b3a0",
	"HALF_CIRCLE_COLOR" : "white",
	"HALF_CIRCLE_OPACITY" : "1.0",

	/* Timeline Container */
	"TIMELINE_CONTAINER_BACKGROUND_COLOR": "rgba(224, 237, 228, 0.55)",

	"TIMELINE_MESSAGE":"<span style='font-weight: bold'>Click</span> timeline maps to view in main window.",

	"TIMELINE_LEGEND_HEADER":"Historical Map Scales",
	"TIMELINE_LEGEND_VALUES":[
		{
			"label":"250,000",
			"value":250000,
			"color":"#004ED7",
			"className":"five",
			"lodThreshold":7
		},
		{
			"label":"125,000",
			"value":125000,
			"color":"#0075C4",
			"className":"four",
			"lodThreshold":9
		},
		{
			"label":"62,500",
			"value":62500,
			"color":"#009CB0",
			"className":"three",
			"lodThreshold":10
		},
		{
			"label":"24,000",
			"value":24000,
			"color":"#00C49D",
			"className":"two",
			"lodThreshold":11
		},
		{
			"label":"12,000",
			"value":12000,
			"color":"#00EB89",
			"className":"one",
			"lodThreshold":13
		}
	],

	/* Timeline disabled message (Msg displayed when user zooms too far out) */
	"TIMELINE_DISABLED_MESSAGE":"Zoom closer on the map to enable the timeline",
	"TIMELINE_DISABLED_BACKGROUND_COLOR":"#7C7C7C",
	"TIMELINE_DISABLED_COLOR":"white",
	"TIMELINE_DISABLED_BACKGROUND_OPACITY":"0.65",
	"TIMELINE_DISABLED_BACKGROUND_FONT_SIZE": "1.7em",

	"TOKEN":"04QDlTJ8GZUUva8naL0wGvh3VvkjKJj4zWvasskfpvSOmPVrEkYTYIxq9NfWVTQXcRHPRRsa__RWLSkrXutQ2l2Qsq5wp35iEnk8yvqEXT5kjmnpU4C-CC4HHnSDAUzaXTK8KG_NYRSSKTn-Hpca5NhfgvtOnj_-WblSTT7UAakJtVBs-z75mOOBEm_2TrMH",

	"INFO_THUMBNAIL":"/info/thumbnail",
	"IMAGE_SERVER_CA":"http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_CA/ImageServer/",
	"MAP_SERVER_CA":"http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_Footprints_CA/MapServer",

	"INFO_THUMBNAIL_TOKEN":"?token=" + "04QDlTJ8GZUUva8naL0wGvh3VvkjKJj4zWvasskfpvSOmPVrEkYTYIxq9NfWVTQXcRHPRRsa__RWLSkrXutQ2l2Qsq5wp35iEnk8yvqEXT5kjmnpU4C-CC4HHnSDAUzaXTK8KG_NYRSSKTn-Hpca5NhfgvtOnj_-WblSTT7UAakJtVBs-z75mOOBEm_2TrMH",
	"IMAGE_SERVER":"http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer/",
	"MAP_SERVER":"http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps_Index/MapServer", // + "?self?culture=en&f=json&token=" + "IkxAypOD2nEVLGKrHr-SNYiFhlUs96IGpIaH2E1xXAB-JwIqiy--IotPbsr7nWVUoR3SzCiCtxCZTTZZfKvuEGEiX6idPZ_h4oc5-A71gJs9Z5yL_AVlUpmRtCn6BtmAYTb7cLTxerg0UEuhYwDtYk54RAE1AULhOjSY8ysOP-8MMRZIocFauQxB3eVUTHJS"

	/* Basemap initialization properties */
	"BASEMAP_STYLE": "topo",
	"BASEMAP_INIT_LAT":29.939833,
	"BASEMAP_INIT_LNG":-90.076046,
	"BASEMAP_INIT_ZOOM":12,

	/* Geocoder Dijit */
	"GEOCODER_PLACEHOLDER_TEXT": "Find a Place",

	"TOPO_INDEX":"http://services.arcgis.com/YkVYBaX0zm7bsV3k/ArcGIS/rest/services/USGSTopoIndex/FeatureServer/0",

	"OUTFIELDS":['*'],

	"MSG_UNKNOWN":"Unknown",

	"TIMELINE_STYLE":"box",
	"TIMELINE_HEIGHT":"240",
	"TIMELINE_ZOOM_MIN":201536000000,
	"TIMELINE_ZOOM_MAX":4153600000000,
	"TIMELINE_CLUSTER":false,
	"TIMELINE_SHOW_NAVIGATION":false,
	"TIMELINE_MIN_DATE":'1850',
	"TIMELINE_MAX_DATE":'2015',
	"TIMELINE_STEP":5,
	"TIMELINE_ANIMATE":true,

	"ZOOM_LEVEL_THRESHOLD":9,
	"THUMBNAIL_VISIBLE_THRESHOLD":12,
	"THUMBNAIL_VISIBLE_THRESHOLD_MSG": "Zoom Closer to view map",

	// TMP
	"DOWNLOAD_PATH":"http://ims.er.usgs.gov/gda_services/download?item_id=",

	/* Mouseover/Mouseout graphic styles (FILL and BORDER) */
	"IMAGE_FILL_COLOR_R": 146,
	"IMAGE_FILL_COLOR_G": 179,
	"IMAGE_FILL_COLOR_B": 160,
	"IMAGE_FILL_OPACITY":0.0,
	"IMAGE_BORDER_COLOR_R": 48,
	"IMAGE_BORDER_COLOR_G": 75,
	"IMAGE_BORDER_COLOR_B": 60,
	"IMAGE_BORDER_OPACITY":1.0,
	"IMAGE_BORDER_WIDTH":1.75,

	"EXTENT_EXPAND":0.60,
	"QUERY_GEOMETRY": "MAP_POINT",

	"SHARING_RELATED":"",
	"SHARING_HASHTAG":"USGS",

	"MAP_CLICK_HANDLER_ON":true
};