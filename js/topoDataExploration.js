require([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/fx",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/Deferred",
	"dojo/aspect",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/io-query",
	"dojo/json",
	"dojo/mouse",
	"dojo/number",
	"dojo/on",
	"dojo/parser",
	"dojo/promise/all",
	"dojo/query",
	"dojo/ready",
	"dojo/topic",
	"dojo/store/Observable",
	"dojo/store/Memory",
	"dojo/window",
	"dgrid/extensions/DnD",
	"dgrid/OnDemandGrid",
	"dgrid/editor",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dgrid/util/mouse",
	"dijit/form/Button",
	"dijit/form/HorizontalSlider",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/dijit/Geocoder",
	"esri/geometry/Extent",
	"esri/geometry/Point",
	"esri/SpatialReference",
	"esri/graphic",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ArcGISImageServiceLayer",
	"esri/layers/ImageServiceParameters",
	"esri/layers/MosaicRule",
	"esri/map",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/Color",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/urlUtils",
	"dojo/domReady!"],
		function (array, declare, fx, lang, win, Deferred, aspect, dom, domAttr, domClass, domConstruct, domGeom, domStyle, ioQuery, json, mouse, number, on, parser, all, query, ready, topic, Observable, Memory, win, DnD, Grid, editor, Selection, Keyboard, mouseUtil, Button, HorizontalSlider, BorderContainer, ContentPane, registry, arcgisUtils, Geocoder, Extent, Point, SpatialReference, Graphic, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, ImageServiceParameters, MosaicRule, Map, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color, Query, QueryTask, urlUtils) {

			var map,
					options,
					OUTFIELDS,
					TOKEN,
					IMAGE_SERVICE_URL,
					imageServiceLayer,
					DOWNLOAD_PATH,

			// dgrid store
					store,
					storeData = [],

			// dgrid
					grid,
					mouseOverGraphic,

			// timeline data and filters
					timeline,
					timelineOptions,
					timelineData = [],
					filter = [],
					TOPO_MAP_SCALES,
					mapScaleValues = [],

			// sharing URL
					sharingUrl,

			//urlObject,
					urlQueryObject,

			// loading icon
					loading,

			// timeline container dimensions
					timelineContainerGeometry,

					filteredData,
					filterSelection = [],

					legendNode,

					crosshairSymbol,
					crosshairGraphic,

					timelineContainerNode,
					timelineContainerNodeGeom,

					currentLOD,
					currentMapExtent,
					currentMapClickPoint,

					nScales = 0,
					maxScaleValue = 0,
					minScaleValue = 0;

			ready(function () {
				parser.parse();
				document.title = Config.APP_TITLE;
				OUTFIELDS = Config.OUTFIELDS;
				// TODO Remove at some point and use OAuth
				TOKEN = Config.TOKEN;
				IMAGE_SERVICE_URL = Config.IMAGE_SERVER + Config.IMAGE_SERVER_JSON + TOKEN;
				TOPO_MAP_SCALES = Config.TIMELINE_LEGEND_VALUES;
				DOWNLOAD_PATH = Config.DOWNLOAD_PATH;

				for (var i = 0; i < TOPO_MAP_SCALES.length; i++) {
					mapScaleValues.push(TOPO_MAP_SCALES[i].value);
				}

				crosshairSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CROSS, Config.CROSSHAIR_SIZE, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(Config.CROSSHAIR_FILL_COLOR), Config.CROSSHAIR_OPACITY));

				nScales = getNumberOfScales(TOPO_MAP_SCALES);
				maxScaleValue = getMaxScaleValue(TOPO_MAP_SCALES);
				minScaleValue = getMinScaleValue(TOPO_MAP_SCALES);

				loadAppStyles();

				loading = dom.byId("loadingImg");
				urlQueryObject = getUrlParameters();
				initBaseMap(urlQueryObject);
				initGeocoderDijit("geocoder");

				on(map, "load", mapLoadedHandler);
				on(map, "click", mapClickHandler);
				on(map, "extent-change", extentChangeHandler);
				on(map, "update-start", showLoadingIndicator);
				on(map, "update-end", hideLoadingIndicator);
				on(document, ".share_facebook:click", shareFacebook);
				on(document, ".share_twitter:click", shareTwitter);
				on(document, ".share_bitly:click", requestBitly);
				on(document, "click", documentClickHandler);

				var columns = [
					{
						label:" ",
						field:"objID",
						hidden:true
					},
					{
						label:" ",
						field:"name",
						renderCell:thumbnailRenderCell
					},
					editor({
						label:" ",
						field:"transparency",
						editorArgs:{
							value:0,
							minimum:0,
							maximum:1.0,
							intermediateChanges:true
						}
					}, HorizontalSlider)
				];

				grid = new (declare([Grid, Selection, DnD, Keyboard]))({
					store:store = createOrderedStore(storeData, {
						idProperty:"objID"
					}),
					columns:columns,
					showHeader:false,
					selectionMode:"single",
					dndParams:{
						singular:true
					},
					getObjectDndType:function (item) {
						return [item.type ? item.type : this.dndSourceType];
					}
				}, "grid");

				grid.on("dgrid-datachange", gridDataChangeHandler);
				grid.on("dgrid-refresh-complete", gridRefreshHandler);
				grid.on(mouseUtil.enterCell, gridEnterCellHandler);
				grid.on(mouseUtil.leaveCell, gridLeaveCellHandler);
				/*aspect.after(grid, "renderRow", function(row, args) {
				 console.log(row)
				 });*/

				// timeline options
				timelineOptions = {
					"width":"100%",
					"height":Config.TIMELINE_HEIGHT + "px",
					"style":Config.TIMELINE_STYLE,
					"showNavigation":Config.TIMELINE_SHOW_NAVIGATION,
					"max":new Date(Config.TIMELINE_MAX_DATE, 0, 0),
					"min":new Date(Config.TIMELINE_MIN_DATE, 0, 0),
					"scale":links.Timeline.StepDate.SCALE.YEAR,
					"step":Config.TIMELINE_STEP,
					"stackEvents":true,
					"zoomMax":Config.TIMELINE_ZOOM_MAX,
					"zoomMin":Config.TIMELINE_ZOOM_MIN,
					"cluster":Config.TIMELINE_CLUSTER,
					"animate":Config.TIMELINE_ANIMATE
				};
				// TODO Change from topo-legend to timeline-legend
				legendNode = query(".topo-legend")[0];
				array.forEach(Config.TIMELINE_LEGEND_VALUES, buildLegend);

				watchSplitters(registry.byId("main-window"));

				timelineContainerNode = dom.byId("timeline-container");
				initUrlParamData(urlQueryObject);
			});

			function loadAppStyles() {
				setAppHeaderStyle(Config.APP_HEADER_TEXT_COLOR, Config.APP_HEADER_BACKGROUND_COLOR);
				setAppHeaderTitle(Config.APP_HEADER_TEXT);
				setAppHeaderSubtitle(Config.APP_SUBHEADER_TEXT);
				setAppMessage(".step-one-message", Config.STEP_ONE_MESSAGE);
				setAppMessage(".step-one-half-circle-msg", Config.STEP_ONE_HALF_CIRCLE_MSG);
				setAppMessage(".step-two-message", Config.STEP_TWO_MESSAGE);
				setAppMessage(".step-two-half-circle-msg", Config.STEP_TWO_HALF_CIRCLE_MSG);
				setAppMessage(".step-three-message", Config.STEP_THREE_MESSAGE);
				setAppMessage(".step-three-half-circle-msg", Config.STEP_THREE_HALF_CIRCLE_MSG);
				setHalfCircleStyle(Config.HALF_CIRCLE_BACKGROUND_COLOR, Config.HALF_CIRCLE_COLOR, Config.HALF_CIRCLE_OPACITY);
				setTimelineLegendHeaderTitle(Config.TIMELINE_LEGEND_HEADER);
				setTimelineContainerStyle(Config.TIMELINE_CONTAINER_BACKGROUND_COLOR);
			}

			function documentClickHandler(e) {
				if (!$("#bitlyIcon").is(e.target) && !$("#bitlyInput").is(e.target) && !$(".popover-content").is(e.target)) {
					$(".popover").hide();
				}
			}

			function buildLegend(legendItem) {
				var node = domConstruct.toDom('<label data-scale="' + legendItem.value + '" data-placement="right" class="btn toggle-scale active" style="background-color: ' + legendItem.color + '">' +
						'<input type="checkbox" name="options"><span data-scale="' + legendItem.value + '">' + legendItem.label + '</span>' +
						'</label>');

				if (urlQueryObject) {
					var _tmpFilters = urlQueryObject.f.split("|");
					var num = number.format(legendItem.value, {
						places:0,
						pattern:"#"
					});
					var i = _tmpFilters.indexOf(num);
					if (_tmpFilters[i] !== undefined) {
						domClass.toggle(node, "sel");
						domStyle.set(node, "opacity", "0.3");
						filter.push(_tmpFilters[i]);
					} else {
						//
					}
				}

				on(node, "click", function (evt) {
					var selectedScale = evt.target.getAttribute("data-scale");
					domClass.toggle(this, "sel");
					if (domClass.contains(this, "sel")) {
						var j = filter.indexOf(selectedScale);
						if (j === -1) {
							filter.push(selectedScale);
						}
						domStyle.set(this, "opacity", "0.3");
						filterSelection.push(selectedScale);
					} else {
						var k = filter.indexOf(selectedScale);
						if (k !== -1) {
							filter.splice(k, 1);
						}
						domStyle.set(this, "opacity", "1.0");
						var i = filterSelection.indexOf(selectedScale);
						if (i != -1) {
							filterSelection.splice(i, 1);
						}
					}
					drawTimeline(timelineData);
				});
				domConstruct.place(node, legendNode);
			}

			function watchSplitters(bc) {
				array.forEach(["bottom"], function (region) {
					var spl = bc.getSplitter(region);
					aspect.after(spl, "_startDrag", function () {
						domStyle.set(spl.child.domNode, "opacity", "0.4");
					});
					aspect.after(spl, "_stopDrag", function () {
						domStyle.set(spl.child.domNode, "opacity", "1.0");
						// TODO Timeline height needs to be resized accordingly
						var node = dom.byId("timeline-container");
						timelineContainerNodeGeom = domStyle.getComputedStyle(timelineContainerNode);
						timelineContainerGeometry = domGeom.getContentBox(node, timelineContainerNodeGeom);
						drawTimeline(timelineData);
					});
				});
			}

			function showLoadingIndicator() {
				esri.show(loading);
				map.disableMapNavigation();
			}

			function hideLoadingIndicator() {
				esri.hide(loading);
				map.enableMapNavigation();
			}

			function getUrlParameters() {
				var urlObject = urlUtils.urlToObject(window.location.href);
				return urlObject.query;
			}

			function initUrlParamData(urlQueryObject) {
				if (urlQueryObject) {
					console.debug("urlQueryObject", urlQueryObject);
					var _mp = new Point([urlQueryObject.clickLat, urlQueryObject.clickLng], new SpatialReference({ wkid:102100 }));
					if (urlQueryObject.oids.length > 0) {
						var queryTask = new QueryTask(IMAGE_SERVICE_URL);
						var q = new Query();
						q.returnGeometry = true;
						q.outFields = OUTFIELDS;
						q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
						if (Config.QUERY_GEOMETRY === "MAP_POINT") {
							q.geometry = _mp;
						} else {
							q.geometry = currentMapExtent.expand(Config.EXTENT_EXPAND);
						}
						var deferreds = [];
						// we need to fire off a query for 'each' OID, not all at once
						array.forEach(urlQueryObject.oids.split("|"), function (oid) {
							var deferred = new Deferred();
							q.where = "OBJECTID = " + oid;
							deferred = queryTask.execute(q).addCallback(function (rs) {
								return rs.features[0];
							});
							deferreds.push(deferred);
						});// END forEach

						var layers = [];
						all(deferreds).then(function (results) {
							var downloadIds = urlQueryObject.dlids.split("|");
							array.forEach(results, function (feature, index) {
								// OID
								var objID = feature.attributes.OBJECTID;
								// map name
								var mapName = feature.attributes.Map_Name;
								// extent
								var extent = feature.geometry.getExtent();
								// date current
								var dateCurrent = feature.attributes.DateCurrent;
								if (dateCurrent === null)
									dateCurrent = Config.MSG_UNKNOWN;
								// scale
								var scale = feature.attributes.Map_Scale;
								var scaleLabel = number.format(scale, {
									places:0
								});
								// LOD
								var lodThreshold = setLodThreshold(scale);

								var mosaicRule = new MosaicRule({
									"method":MosaicRule.METHOD_CENTER,
									"ascending":true,
									"operation":MosaicRule.OPERATION_FIRST,
									"where":"OBJECTID = " + objID
								});
								params = new ImageServiceParameters();
								params.noData = 0;
								params.mosaicRule = mosaicRule;
								imageServiceLayer = new ArcGISImageServiceLayer(IMAGE_SERVICE_URL, {
									imageServiceParameters:params,
									opacity:1.0
								});
								layers.push(imageServiceLayer);

								store.put({
									id:"1",
									objID:objID,
									layer:imageServiceLayer,
									name:mapName,
									imprintYear:dateCurrent,
									scale:scale,
									scaleLabel:scaleLabel,
									lodThreshold:lodThreshold,
									downloadLink:DOWNLOAD_PATH + downloadIds[index],
									extent:extent
								});
							});// End forEach
							return layers.reverse();
						}).then(function (layers) {
									array.forEach(layers, function (layer, index) {
										map.addLayer(layer, index + 1);
									});
								});// END all
						timelineContainerNodeGeom = domStyle.getComputedStyle(timelineContainerNode);
						timelineContainerGeometry = domGeom.getContentBox(timelineContainerNode, timelineContainerNodeGeom);
						if (timelineContainerGeometry.h === 0) {
							var n = registry.byId("timeline-container").domNode;
							fx.animateProperty({
								node:n,
								duration:1000,
								properties:{
									height:{
										end:250
									}
								},
								onEnd:function () {
									registry.byId("main-window").layout();
								}
							}).play();
						}
						hideStep(".stepOne", "");
						showGrid();
						runQuery(currentMapExtent, _mp, urlQueryObject.zl);
					} else {
						// TODO there are no OID's, check if the timeline was visible
						if (_mp) {
							runQuery(currentMapExtent, _mp, urlQueryObject.zl);
						}
					}
				}
			}

			function setSharingUrl() {
				var mapClickX,
						mapClickY;
				if (!currentMapClickPoint) {
					// User is sharing the app but never even clicked on the map
					// Leave these params empty
					mapClickX = "";
					mapClickY = "";
				} else {
					mapClickX = currentMapClickPoint.x;
					mapClickY = currentMapClickPoint.y;
				}

				var lat = map.extent.getCenter().getLatitude();
				var lng = map.extent.getCenter().getLongitude();
				var zoomLevel = map.getLevel();
				var timelineDateRange = "",
						minDate = "",
						maxDate = "";
				if (timeline) {
					timelineDateRange = timeline.getVisibleChartRange();
					minDate = new Date(timelineDateRange.start).getFullYear();
					maxDate = new Date(timelineDateRange.end).getFullYear();
				} else {
					// TODO No timeline, do something
				}
				var objectIDs = "";
				var downloadIDs = "";
				query(".dgrid-row", grid.domNode).forEach(function (node) {
					var row = grid.row(node);
					objectIDs += row.data.objID + "|";
					downloadIDs += row.data.downloadLink.split("=")[1] + "|";
				});
				objectIDs = objectIDs.substr(0, objectIDs.length - 1);
				downloadIDs = downloadIDs.substr(0, downloadIDs.length - 1);

				var filters = "";
				array.forEach(filterSelection, function (filter) {
					filters += filter + "|";
				});
				filters = filters.substr(0, filters.length - 1);

				var protocol = window.location.protocol;
				var host = window.location.host;
				var pathName = window.location.pathname;
				var fileName = "";
				var pathArray = window.location.pathname.split("/");
				if (pathArray[pathArray.length - 1] !== "index.html") {
					fileName = "index.html";
				} else {
					fileName = "";
				}

				sharingUrl = protocol + "//" + host + pathName + fileName +
						"?lat=" + lat + "&lng=" + lng + "&zl=" + zoomLevel +
						"&minDate=" + minDate + "&maxDate=" + maxDate +
						"&oids=" + objectIDs +
						"&dlids=" + downloadIDs +
						"&f=" + filters +
						"&clickLat=" + mapClickX +
						"&clickLng=" + mapClickY;
				return sharingUrl;
			}

			function filterData(dataToFilter, filter) {
				var _filteredData = [];
				var exclude = false;
				var nFilters = filter.length;

				if (nFilters > 0) {
					array.forEach(dataToFilter, function (item) {
						// loop through each filter
						for (var i = 0; i < nFilters; i++) {
							var _filterScale = number.parse(filter[i]);
							var _mapScale = item.scale;
							var _pos = array.indexOf(mapScaleValues, _filterScale);
							var _lowerBoundScale;
							var _upperBoundScale;
							var current;

							if (_pos !== -1) {
								if (TOPO_MAP_SCALES[_pos + 1] !== undefined) {
									_lowerBoundScale = TOPO_MAP_SCALES[(_pos + 1)].value;
								} else {
									_lowerBoundScale = "";
								}

								if (TOPO_MAP_SCALES[_pos].value) {
									current = TOPO_MAP_SCALES[_pos].value;
								}

								if (TOPO_MAP_SCALES[(_pos - 1)] !== undefined) {
									_upperBoundScale = TOPO_MAP_SCALES[(_pos)].value;
								} else {
									_upperBoundScale = "";
								}
							}

							if (_lowerBoundScale === "") {
								if (_mapScale <= _filterScale) {
									exclude = true;
									break;
								}
							}

							if (_upperBoundScale === "") {
								if (_mapScale >= _filterScale) {
									exclude = true;
									break;
								}
							}

							if (_lowerBoundScale !== "" && _upperBoundScale !== "") {
								if (_mapScale > _lowerBoundScale && _mapScale <= _upperBoundScale) {
									exclude = true;
									break;
								}
							}
						}

						if (!exclude) {
							_filteredData.push(item);
						}
						exclude = false;
					});
					return _filteredData;
				} else {
					return dataToFilter;
				}
			}

			function mapClickHandler(evt) {
				currentMapClickPoint = evt.mapPoint;
				currentLOD = map.getLevel();
				if (crosshairGraphic) {
					map.graphics.remove(crosshairGraphic);
				}
				crosshairGraphic = new Graphic(currentMapClickPoint, crosshairSymbol);
				map.graphics.add(crosshairGraphic);
				runQuery(currentMapExtent, currentMapClickPoint, currentLOD);
			}

			function extentChangeHandler(evt) {
				currentMapExtent = evt.extent;
				currentLOD = evt.lod.level;
				//console.debug("extentChangeHanler", currentMapExtent, currentMapClickPoint, currentLOD);
				query('.dgrid-row', grid.domNode).forEach(function (node) {
					var row = grid.row(node);
					var lodThreshold = row.data.lodThreshold;
					var maskId = domAttr.get(node, "id") + "-mask";
					if (currentLOD <= lodThreshold) {
						// disable row
						if (dom.byId("" + maskId) === null) {
							domConstruct.create("div", {
								id:"" + maskId,
								"class":"grid-map",
								innerHTML:"<p style='text-align: center; margin-top: 20px'>" + Config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
							}, node, "first");
						}
					} else {
						// enable row
						domConstruct.destroy("" + maskId);
					}
				});
			}

			function runQuery(mapExtent, mp, lod) {
				var queryTask = new QueryTask(Config.QUERY_TASK_URL);
				var q = new Query();
				q.returnGeometry = true;
				q.outFields = Config.QUERY_TASK_OUTFIELDS;
				q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
				q.where = Config.QUERY_WHERE;
				if (Config.QUERY_WHERE !== "") {
					q.where = Config.QUERY_WHERE;
				}
				if (Config.QUERY_GEOMETRY === "MAP_POINT") {
					q.geometry = mp;
				} else {
					q.geometry = mapExtent.expand(Config.EXTENT_EXPAND);
				}

				showLoadingIndicator();
				var deferred = queryTask.execute(q).addCallback(function (response) {
					timelineData = [];
					var nFeatures = response.features.length;

					if (nFeatures > 0) {
						query(".timeline-mask").forEach(domConstruct.destroy);
						timelineContainerNodeGeom = domStyle.getComputedStyle(timelineContainerNode);
						timelineContainerGeometry = domGeom.getContentBox(timelineContainerNode, timelineContainerNodeGeom);
						if (timelineContainerGeometry.h === 0) {
							var n = registry.byId("timeline-container").domNode;
							fx.animateProperty({
								node:n,
								duration:1000,
								properties:{
									height:{
										end:250
									}
								},
								onEnd:function () {
									registry.byId("main-window").layout();
								}
							}).play();
						}

						array.forEach(response.features, function (feature) {
							var ext = feature.geometry.getExtent();
							var xmin = ext.xmin;
							var xmax = ext.xmax;
							var ymin = ext.ymin;
							var ymax = ext.ymax;

							var objID = feature.attributes.SvcOID;
							var mapName = feature.attributes[Config.ATTRIBUTE_MAP_NAME];
							var scale = feature.attributes.Map_Scale;
							var dateCurrent = feature.attributes[Config.ATTRIBUTE_DATE];
							if (dateCurrent === null)
								dateCurrent = Config.MSG_UNKNOWN;
							var day = formatDay(dateCurrent);
							var month = formatMonth(dateCurrent);
							var year = formatYear(dateCurrent);
							var formattedDate = month + "/" + day + "/" + year;

							var startDate = new Date(dateCurrent, month, day);

							var downloadLink = feature.attributes[Config.ATTRIBUTE_DOWNLOAD_LINK];
							var citation = feature.attributes[Config.ATTRIBUTE_CITATION];
							var className = setClassname(scale);
							var lodThreshold = setLodThreshold(scale);

							var tooltipContent = "<img class='tooltipThumbnail' src='" + Config.IMAGE_SERVER + "/" + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN + "'>" +
									"<div class='tooltipContainer'>" +
									"<div class='tooltipHeader'>" + mapName + " (" + dateCurrent + ")</div>" +
									"<div class='tooltipContent'>" + citation + "</div></div>";

							var timelineItemContent = '<div class="timelineItemTooltip noThumbnail" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
									'<span class="thumbnailLabel">' + mapName + '</span>';

							timelineData.push({
								"start":startDate,
								"content":timelineItemContent,
								"objID":objID,
								"downloadLink":downloadLink,
								"scale":scale,
								"lodThreshold":lodThreshold,
								"className":className
							});
						}); // END forEach
					} else {
						addNoResultsMask();
					} // END QUERY
					drawTimeline(timelineData);
				}); // END Deferred
			}

			function formatDay(date) {
				if (date instanceof Date)
					return date.getDate();
				else
					return "";
			}

			function formatMonth(date) {
				if (date instanceof Date) {
					var month = date.getMonth();
					if (month === 0) {
						return "01";
					} else if (month === 1) {
						return "02";
					} else if (month === 2) {
						return "03";
					} else if (month === 3) {
						return "04";
					} else if (month === 4) {
						return "05";
					} else if (month === 5) {
						return "06";
					} else if (month === 6) {
						return "07";
					} else if (month === 7) {
						return "08";
					} else if (month === 8) {
						return "09";
					} else if (month === 9) {
						return "10";
					} else if (month === 10) {
						return "11";
					} else if (month === 11) {
						return "12";
					}
				} else {
					return "";
				}
			}

			function formatYear(date) {
				if (date instanceof Date) {
					return date.getFullYear();
				} else {
					return "";
				}
			}

			function addNoResultsMask() {
				domConstruct.create("div", {
					"class":"timeline-mask",
					"innerHTML":"<p style='text-align: center; margin-top: 20px'>" + Config.NO_MAPS_MESSAGE + "</p>"
				}, "timeline", "first");
			}

			function mapLoadedHandler() {
				if (urlQueryObject !== null) {
					var _mp = new Point([urlQueryObject.clickLat, urlQueryObject.clickLng], new SpatialReference({ wkid:102100 }));
					// add crosshair
					addCrosshair(_mp);
				}
			}

			function thumbnailRenderCell(object, data, td, options) {
				console.log(object);
				var objID = object.objID;
				var mapName = object.name;
				var imprintYear = object.imprintYear;
				var downloadLink = object.downloadLink;
				var imgSrc = Config.IMAGE_SERVER + "/" + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN;

				var node = domConstruct.create("div", {
					"class":"renderedCell",
					"innerHTML":"<button class='rm-layer-btn' data-objectid='" + objID + "'> X </button>" +
							"<img class='rm-layer-icon' src='" + imgSrc + "'>" +
							"<div class='thumbnailMapName'>" + mapName + "</div>" +
							"<div class='thumbnailMapImprintYear'>" + imprintYear + "</div>" +
							"<div class='downloadLink'><a href='" + downloadLink + "' target='_parent'>download map</a></div>",
					onclick:function (evt) {
						var objID = evt.target.getAttribute("data-objectid");
						var storeObj = store.query({
							objID:objID
						});

						map.removeLayer(storeObj[0].layer);
						store.remove(objID);
						if (store.data.length < 1) {
							// no remaining items in the grid/store
							map.graphics.remove(mouseOverGraphic);
							map.graphics.clear();
							addCrosshair(currentMapClickPoint);
							hideLoadingIndicator();
							hideStep(".stepThree", ".step-three-message");
							showStep(".stepTwo", ".step-two-message");
						}
					}
				});
				return node;
			}

			function drawTimeline(data) {
				filteredData = filterData(data, filter);
				//console.debug("drawTimeline", filteredData);
				topic.subscribe("/dnd/drop", function (source, nodes, copy, target) {
					var layers = [];
					query(".grid-map").forEach(domConstruct.destroy);
					query(".dgrid-row").forEach(function (node) {
						var row = target.grid.row(node);
						if (row) {
							layers.push(row.data.layer);
							map.removeLayer(row.data.layer);

							var lodThreshold = row.data.lodThreshold;
							var maskId = domAttr.get(node, "id") + "-mask";
							if (currentLOD <= lodThreshold) {
								// disable row
								if (dom.byId("" + maskId) === null) {
									domConstruct.create("div", {
										"id":"" + maskId,
										"class":"grid-map",
										"innerHTML":"<p style='text-align: center; margin-top: 20px'>" + Config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
									}, node, "first");
								}
							} else {
								// enable row
								domConstruct.destroy("" + maskId);
							}
						}
					});

					var j = layers.length;
					while (j >= 0) {
						map.addLayer(layers[j]);
						j--;
					}
				});

				if (timeline === undefined) {
					if (urlQueryObject) {
						timelineOptions.start = new Date(urlQueryObject.minDate, 0, 0);
						timelineOptions.end = new Date(urlQueryObject.maxDate, 0, 0);
					}
					timeline = new links.Timeline(dom.byId("timeline"));
					timeline.draw(filteredData, timelineOptions);
					links.events.addListener(timeline, "ready", onTimelineReady);
					links.events.addListener(timeline, "select", onSelect);
					//links.events.addListener(timeline, "rangechanged", timelineRangeChanged);
					hideStep(".stepOne", "");
					showStep(".stepTwo", ".step-two-message");
				} else {
					var height = timelineContainerGeometry ? timelineContainerGeometry.h : Config.TIMELINE_HEIGHT;
					//timelineOptions.height = height + "px";
					//timeline.draw(filteredData, timelineOptions);
					timeline.setData(filteredData);
					timeline.redraw();
				}

				$(".timelineItemTooltip").tooltipster({
					theme:"tooltipster-shadow",
					contentAsHTML:true,
					position:"right",
					offsetY:20
				});

				$(".timeline-event").mouseenter(function (evt) {
					// TODO IE / What a mess!
					var xmin, ymin, xmax, ymax, extent, sfs;
					if (evt.target.children[0].children[0].getAttribute("data-xmin")) {
						xmin = evt.target.children[0].children[0].getAttribute("data-xmin");
						xmax = evt.target.children[0].children[0].getAttribute("data-xmax");
						ymin = evt.target.children[0].children[0].getAttribute("data-ymin");
						ymax = evt.target.children[0].children[0].getAttribute("data-ymax");
						extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
					// TODO
					var data = evt.currentTarget.childNodes[0].childNodes[0].dataset;
					if (data) {
						extent = new Extent(data.xmin, data.ymin, data.xmax, data.ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
				}).mouseleave(function () {
							map.graphics.remove(mouseOverGraphic);
							map.graphics.clear();
							addCrosshair(currentMapClickPoint);
						});
				hideLoadingIndicator();
			}

			function onSelect() {
				var sel = timeline.getSelection();
				var _timelineData = timeline.getData();
				if (sel.length) {
					if (sel[0].row !== undefined) {
						var row = sel[0].row;
						var objID = _timelineData[row].objID;
						// check to see if the timeline item is in the store
						var objIDs = store.query({
							objID:objID
						});

						if (objIDs.length < 1) {
							var downloadLink = _timelineData[row].downloadLink;
							var lodThreshhold = _timelineData[row].lodThreshold;
							var whereClause = Config.IMAGE_SERVER_WHERE + objID;
							var queryTask = new QueryTask(IMAGE_SERVICE_URL);
							var q = new Query();
							q.returnGeometry = false;
							q.outFields = OUTFIELDS;
							q.where = whereClause;
							queryTask.execute(q,function (rs) {
								var extent = rs.features[0].geometry.getExtent();
								var mapName = rs.features[0].attributes.Map_Name;
								var dateCurrent = rs.features[0].attributes.DateCurrent;

								if (dateCurrent === null)
									dateCurrent = Config.MSG_UNKNOWN;
								var scale = rs.features[0].attributes.Map_Scale;
								var scaleLabel = number.format(scale, {
									places:0
								});

								var mosaicRule = new MosaicRule({
									"method":MosaicRule.METHOD_CENTER,
									"ascending":true,
									"operation":MosaicRule.OPERATION_FIRST,
									"where":whereClause
								});
								params = new ImageServiceParameters();
								params.noData = 0;
								params.mosaicRule = mosaicRule;
								imageServiceLayer = new ArcGISImageServiceLayer(IMAGE_SERVICE_URL, {
									imageServiceParameters:params,
									opacity:1.0
								});
								map.addLayer(imageServiceLayer);

								var _firstRow;
								if (query(".dgrid-row", grid.domNode)[0]) {
									var rowId = query(".dgrid-row", grid.domNode)[0].id;
									_firstRow = rowId.split("-")[2];
								}
								var firstRowObj = store.query({
									objID:_firstRow
								});

								store.put({
									id:"1",
									objID:objID,
									layer:imageServiceLayer,
									name:mapName,
									imprintYear:dateCurrent,
									scale:scale,
									scaleLabel:scaleLabel,
									lodThreshold:lodThreshhold,
									downloadLink:downloadLink,
									extent:extent
								}, {
									before:firstRowObj[0]
								});
							}).then(function (evt) {
										hideStep(".stepTwo", ".step-two-message");
										showStep(".stepThree", ".step-three-message");
										showGrid();
										grid.refresh();
									}); // END execute
						} else {
							// TODO already in the store/added to the map (alert the user)
						}
					}
				}
			}

			function onTimelineReady() {
				// if the grid is visible, step 3 is visible, so hide step 2
				if ($(".gridContainer").css("display") === "block") {
					hideStep(".stepTwo", ".step-two-message");
				}
			}

			function timelineRangeChanged(e) {
				timelineOptions.step = 5;
				timeline.draw(filteredData, timelineOptions);
				$(".timelineItemTooltip").tooltipster({
					theme:"tooltipster-shadow",
					contentAsHTML:true,
					position:"right",
					offsetY:20
				});

				$(".timeline-event").mouseenter(function (evt) {
					// TODO IE / What a mess!
					var xmin, ymin, xmax, ymax, extent, sfs;
					if (evt.target.children[0].children[0].getAttribute("data-xmin")) {
						xmin = evt.target.children[0].children[0].getAttribute("data-xmin");
						xmax = evt.target.children[0].children[0].getAttribute("data-xmax");
						ymin = evt.target.children[0].children[0].getAttribute("data-ymin");
						ymax = evt.target.children[0].children[0].getAttribute("data-ymax");
						extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
					// TODO
					var data = evt.currentTarget.childNodes[0].childNodes[0].dataset;
					if (data) {
						extent = new Extent(data.xmin, data.ymin, data.xmax, data.ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(Config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
				}).mouseleave(function () {
							map.graphics.remove(mouseOverGraphic);
							map.graphics.clear();
							addCrosshair(currentMapClickPoint);
						});

				//query(".timeline-axis-text").style("font-size", "1.0em");
				//timeline.setData(filteredData);
				//timeline.redraw();
			}

			function createOrderedStore(data, options) {
				// Instantiate a Memory store modified to support ordering.
				return Observable(new Memory(lang.mixin({data:data,
					idProperty:"id",
					put:function (object, options) {
						object.id = calculateOrder(this, object, options && options.before);
						return Memory.prototype.put.call(this, object, options);
					},
					// Memory's add does not need to be augmented since it calls put
					copy:function (object, options) {
						// summary:
						//		Given an item already in the store, creates a copy of it.
						//		(i.e., shallow-clones the item sans id, then calls add)
						var k, obj = {}, id, idprop = this.idProperty, i = 0;
						for (k in object) {
							obj[k] = object[k];
						}
						// Ensure unique ID.
						// NOTE: this works for this example (where id's are strings);
						// Memory should autogenerate random numeric IDs, but
						// something seems to be falling through the cracks currently...
						id = object[idprop];
						if (id in this.index) {
							// rev id
							while (this.index[id + "(" + (++i) + ")"]) {
							}
							obj[idprop] = id + "(" + i + ")";
						}
						this.add(obj, options);
					},
					query:function (query, options) {
						options = options || {};
						options.sort = [
							{attribute:"id"}
						];
						return Memory.prototype.query.call(this, query, options);
					}
				}, options)));
			}

			function calculateOrder(store, object, before, orderField) {
				// Calculates proper value of order for an item to be placed before another
				var afterOrder,
						beforeOrder = 0;
				if (!orderField) {
					orderField = "id";
				}

				if (before) {
					// calculate midpoint between two items' orders to fit this one
					afterOrder = before[orderField];
					store.query({}, {}).forEach(function (object) {
						var ord = object[orderField];
						if (ord > beforeOrder && ord < afterOrder) {
							beforeOrder = ord;
						}
					});
					return (afterOrder + beforeOrder) / 2;
				} else {
					// find maximum order and place this one after it
					afterOrder = 0;
					store.query({}, {}).forEach(function (object) {
						var ord = object[orderField];
						if (ord > afterOrder) {
							afterOrder = ord;
						}
					});
					return afterOrder + 1;
				}
			}

			function initBaseMap(urlQueryObject) {
				var _lat, _lng, _lod;
				if (urlQueryObject) {
					_lat = urlQueryObject.lat;
					_lng = urlQueryObject.lng;
					_lod = urlQueryObject.zl;
				} else {
					_lat = Config.BASEMAP_INIT_LAT;
					_lng = Config.BASEMAP_INIT_LNG;
					_lod = Config.BASEMAP_INIT_ZOOM;
				}
				map = new Map("map", {
					basemap:Config.BASEMAP_STYLE,
					center:[_lng, _lat],
					zoom:_lod
				});
			}

			function initGeocoderDijit(srcRef) {
				geocoder = new Geocoder({
					map:map,
					autoComplete:true,
					showResults:true,
					searchDelay:250,
					arcgisGeocoder:{
						placeholder:Config.GEOCODER_PLACEHOLDER_TEXT
					}
				}, srcRef);
				geocoder.startup();
			}

			function setClassname(scale) {
				var className;
				if (scale <= TOPO_MAP_SCALES[4].value) {
					className = "one";	// 0 - 12000
				} else if (scale > TOPO_MAP_SCALES[4].value && scale <= TOPO_MAP_SCALES[3].value) {
					className = "two";	// 12001 - 24000
				} else if (scale > TOPO_MAP_SCALES[3].value && scale <= TOPO_MAP_SCALES[2].value) {
					className = "three";// 24001 - 63360
				} else if (scale > TOPO_MAP_SCALES[2].value && scale <= TOPO_MAP_SCALES[1].value) {
					className = "four";	// 63361 - 125000
				} else if (scale > TOPO_MAP_SCALES[1].value) {
					className = "five";	// 125001 - 250000
				}
				return className;
			}

			function setLodThreshold(scale) {
				var _lodThreshold;
				var i = nScales;
				while (i > 0) {
					if (scale <= minScaleValue) {
						_lodThreshold = TOPO_MAP_SCALES[TOPO_MAP_SCALES.length - 1].lodThreshold;
						break;
					}

					if (scale > TOPO_MAP_SCALES[i].value && scale <= TOPO_MAP_SCALES[i - 1].value) {
						_lodThreshold = TOPO_MAP_SCALES[i - 1].lodThreshold;
						break;
					}

					if (scale > maxScaleValue) {
						_lodThreshold = TOPO_MAP_SCALES[0].lodThreshold;
						break;
					}
					i--;
				}

				/*if (scale <= TOPO_MAP_SCALES[4].value) {
				 _lodThreshold = TOPO_MAP_SCALES[4].lodThreshold;

				 } else if (scale > TOPO_MAP_SCALES[4].value && scale <= TOPO_MAP_SCALES[3].value) {
				 _lodThreshold = TOPO_MAP_SCALES[3].lodThreshold;

				 } else if (scale > TOPO_MAP_SCALES[3].value && scale <= TOPO_MAP_SCALES[2].value) {
				 _lodThreshold = TOPO_MAP_SCALES[2].lodThreshold;

				 } else if (scale > TOPO_MAP_SCALES[2].value && scale <= TOPO_MAP_SCALES[1].value) {
				 _lodThreshold = TOPO_MAP_SCALES[1].lodThreshold;

				 } else if (scale > TOPO_MAP_SCALES[1].value) {
				 _lodThreshold = TOPO_MAP_SCALES[0].lodThreshold;
				 }*/
				return _lodThreshold;
			}

			function getNumberOfScales(scales) {
				return scales.length - 1;
			}

			function getMinScaleValue(scales) {
				return scales[nScales].value;
			}

			function getMaxScaleValue(scales) {
				return scales[0].value;
			}

			function createMouseOverGraphic(borderColor, fillColor) {
				var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, borderColor, Config.IMAGE_BORDER_WIDTH), fillColor);
				return sfs;
			}

			function addCrosshair(mp) {
				if (crosshairGraphic) {
					map.graphics.remove(crosshairGraphic);
				}
				crosshairGraphic = new Graphic(mp, crosshairSymbol);
				map.graphics.add(crosshairGraphic);
			}

			function hideStep(className1, className2) {
				$(className1).css("display", "none");
				$(className2).css("display", "none");
			}

			function showStep(className1, className2) {
				$(className1).css("display", "block");
				$(className2).css("display", "block");
			}

			function hideGrid() {
				$(".gridContainer").css("display", "none");
			}

			function showGrid() {
				$(".gridContainer").css("display", "block");
				hideStep(".stepTwo", ".step-two-message");
			}

			/**
			 * Handle for Editor (Horizontal Slider) change events
			 *
			 * @param evt
			 */
			function gridDataChangeHandler(evt) {
				var diff = 1 - evt.value;
				evt.cell.row.data.layer.setOpacity(diff);
				//console.debug("cell: ", evt.cell, evt.cell.row.id, evt.cell.row.data.layer);
			}

			function gridRefreshHandler(event) {
				array.forEach(event.grid.store.data, function (node) {
					var row = grid.row(node);
					var lodThreshold = row.data.lodThreshold;
					var maskId = "grid-row-" + row.data.objID + "-mask";
					if (currentLOD <= lodThreshold) {
						domConstruct.create("div", {
							id:"" + maskId,
							"class":"grid-map",
							innerHTML:"<p style='text-align: center; margin-top: 20px'>" + Config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
						}, row.element, "first");
					} else {

					}
				});
			}

			function gridEnterCellHandler(evt) {
				if (mouseOverGraphic)
					map.graphics.remove(mouseOverGraphic);
				var row = grid.row(evt);
				var extent = row.data.extent;
				var sfs = createMouseOverGraphic(
						new Color(Config.SIDEBAR_MAP_MOUSEOVER_GR_BORDER),
						new Color(Config.SIDEBAR_MAP_MOUSEOVER_GR_FILL));
				mouseOverGraphic = new Graphic(extent, sfs);
				map.graphics.add(mouseOverGraphic);
			}

			function gridLeaveCellHandler(evt) {
				map.graphics.remove(mouseOverGraphic);
				map.graphics.clear();
				addCrosshair(currentMapClickPoint);
			}

			function setAppHeaderStyle(txtColor, backgroundColor) {
				query(".header").style("color", txtColor);
				query(".header").style("background-color", backgroundColor);
			}

			function setAppHeaderTitle(str) {
				query(".header-title")[0].innerHTML = str;
			}

			function setAppHeaderSubtitle(str) {
				query(".subheader-title")[0].innerHTML = str;
			}

			function setAppMessage(node, str) {
				query(node)[0].innerHTML = str;
			}

			function setTimelineLegendHeaderTitle(str) {
				query(".timeline-legend-header")[0].innerHTML = str;
			}

			function setHalfCircleStyle(backgroundColor, color, opacity) {
				query(".halfCircleRight").style("backgroundColor", backgroundColor);
				query(".halfCircleRight").style("color", color);
				query(".halfCircleRight").style("opacity", opacity);
			}

			function setTimelineContainerStyle(backgroundColor) {
				domStyle.set(dom.byId("timeline-container"), "backgroundColor", backgroundColor);
			}


			function fadeIn(node) {
				var _node = query(node)[0];
				var fadeArgs = {
					node:_node,
					duration:600
				};
				fx.fadeIn(fadeArgs).play();
			}


			function get_short_url(long_url, func) {
				$.getJSON(
						"http://api.bitly.com/v3/shorten?callback=?",
						{
							"format":"json",
							"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
							"login":"esristorymaps",
							"longUrl":long_url
						},
						function (response) {
							func(response.data.url);
						}
				);
			}

			function fadeOut(node) {
				var _node = query(node)[0];
				var fadeArgs = {
					node:_node,
					duration:600
				};
				fx.fadeOut(fadeArgs).play();
			}

			/**********
			 *
			 **********/
			function shareFacebook() {
				var url = setSharingUrl();
				var options = '&p[title]=' + encodeURIComponent($('#title').text())
						+ '&p[summary]=' + encodeURIComponent($('#subtitle').text())
						+ '&p[url]=' + encodeURIComponent(url)
						+ '&p[images][0]=' + encodeURIComponent($("meta[property='og:image']").attr("content"));
				//window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
				window.open('http://www.facebook.com/sharer.php?s=100' + options, 'Facebook sharing', 'toolbar=0,status=0,width=626,height=436');
			}

			function shareTwitter() {
				var url = setSharingUrl();

				var bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				];
				var bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1];

				var urlParams = esri.urlToObject(url).query || {};
				var targetUrl = url;

				$.getJSON(
						bitlyUrl,
						{
							"format":"json",
							"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
							"login":"esristorymaps",
							"longUrl":targetUrl
						},
						function (response) {
							if (!response || !response || !response.data.url)
								return;
						}
				).complete(function (response) {
							options = 'text=' + encodeURIComponent($('#title').text()) +
									'&url=' + encodeURIComponent(response.responseJSON.data.url) +
									'&related=' + Config.SHARING_RELATED +
									'&hashtags=' + Config.SHARING_HASHTAG;
							window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
						});
						window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
			}

			function requestBitly() {
				var url = setSharingUrl();
				var bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				];
				var bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1];

				var urlParams = esri.urlToObject(url).query || {};
				var targetUrl = url;

				$.getJSON(
						bitlyUrl,
						{
							"format":"json",
							"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
							"login":"esristorymaps",
							"longUrl":targetUrl
						},
						function (response) {
							if (!response || !response || !response.data.url)
								return;
							$("#bitlyLoad").fadeOut();
							$("#bitlyInput").fadeIn();
							$("#bitlyInput").val(response.data.url);
							$("#bitlyInput").select();
						}
				);
				$(".popover").show();
			}
		});