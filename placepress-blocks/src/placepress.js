document.addEventListener("DOMContentLoaded", () => {
	(() => {
		const defaults =
			typeof placepress_plugin_options !== "undefined"
				? placepress_plugin_options
				: null;
		var active_index = null; // marker array position; to be opened upon map display
		const iconSettings = {
			mapIconSVG: '<svg id="marker" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><style>#circle{fill:{mapIconCircleColor};}#circle,#color{stroke:{mapIconColorStroke};stroke-width:{mapIconStrokeWidth};}#color{fill:{mapIconColor};}#shadow{fill:#c4c4c4;isolation:isolate;}#shadow,#mask{opacity:.3;}#shadow,#shadow-2{stroke-width:0px;}#shadow-2{fill:#bfbfbf;fill-rule:evenodd;}</style></defs><g id="marker-icon"><g id="icon"><ellipse id="shadow" cx="24" cy="40.16" rx="13.47" ry="7.48"/><g id="mask"><g id="group"><path id="shadow-2" d="M24,47.64c7.48,0,13.47-3.29,13.47-7.48s-5.99-7.48-13.47-7.48-13.47,3.29-13.47,7.48,5.99,7.48,13.47,7.48Z"/></g></g><path id="color" d="M37.84,15.32c-.17,2.73-.92,5.39-2.19,7.82-1.4,2.89-3.03,5.67-4.86,8.3-1.77,2.6-3.54,4.91-4.87,6.56-.66.83-1.22,1.49-1.6,1.95-.13.15-.23.28-.32.38-.09-.1-.2-.23-.33-.39-.39-.46-.94-1.13-1.6-1.97-1.33-1.67-3.1-3.99-4.87-6.6-1.83-2.64-3.45-5.42-4.86-8.31-1.26-2.4-2.01-5.04-2.19-7.75-.15-7.81,6.04-14.27,13.84-14.44,7.81.18,14,6.64,13.84,14.44Z"/><path id="circle" d="M29.31,14.72c0,2.93-2.38,5.31-5.31,5.31-2.93,0-5.31-2.38-5.31-5.31s2.38-5.31,5.31-5.31c2.93,0,5.31,2.38,5.31,5.31,0,0,0,0,0,0Z"/></g></g></svg>',
			mapIconColor: '#3a8ece',
			mapIconColorStroke: 'rgba(0,0,0,.15)',
			mapIconStrokeWidth: '2px',
			mapIconCircleColor: '#fff',
		};
		const divIcon = L.divIcon({
			className: "leaflet-data-marker",
			html: L.Util.template(iconSettings.mapIconSVG, iconSettings),
			iconAnchor: [22, 44],
			iconSize: [44, 44],
			popupAnchor: [0, -44]
		});

		// Extract Location Map Settings from HTML
		const getDataAttributesPPLocation = () => {
			const locations = document.querySelectorAll(".map-pp") || false;
			const settings = [];
			if (locations) {
				// is this a hidden archive map figure added by archive_title filter?
				if(locations[0] && locations[0].parentElement.getAttribute("hidden") !== null){
					// move it up a level (out of title) and unhide
					let container = locations[0].parentElement.parentElement;
					container.insertAdjacentElement('afterend', locations[0].parentElement)
					locations[0].parentElement.removeAttribute("hidden");
				}
				locations.forEach((location, i) => {
					s = {};
					s.mapId = location.getAttribute("id");
					if (s.mapId) {
						let newId = s.mapId + "_" + i;
						location.setAttribute("id", newId);
						s.mapId = newId;
					}
					s.type = location.getAttribute("data-type");
					s.locationType = location.getAttribute("data-location-type");
					s.locationTypeSelection = location.getAttribute(
						"data-location-type-selection"
					);
					s.zoom = Number(location.getAttribute("data-zoom"));
					s.lat = Number(location.getAttribute("data-lat"));
					s.lon = Number(location.getAttribute("data-lon"));
					s.style = location.getAttribute("data-basemap");
					s.maki = location.getAttribute("data-maki");
					s.makiColor = location.getAttribute("data-maki-color");
					s.mbKey = location.getAttribute("data-mb-key");
					s.infowindow =
						location.getAttribute("data-infowindow") &&
						location.getAttribute("data-infowindow").length
							? decodeURI(location.getAttribute("data-infowindow"))
							: s.lat && s.lon
							? s.lat + "," + s.lon
							: "";
					if (s.lat && s.lon) {
						settings[i] = s;
					}
				});
			}
			return settings.length ? settings : false;
		};

		// Extract Tour Map Settings from HTML
		const getDataAttributesPPTour = () => {
			const tour_stops =
				document.querySelectorAll(".pp-tour-stop-section-header-container") ||
				false;
			const settings = [];
			if (tour_stops) {
				tour_stops.forEach((tour_stop, i) => {
					const s = {};
					s.zoom = Number(tour_stop.getAttribute("data-zoom"));
					s.lat = Number(tour_stop.getAttribute("data-lat"));
					s.lon = Number(tour_stop.getAttribute("data-lon"));
					s.style = tour_stop.getAttribute("data-basemap");
					s.maki = tour_stop.getAttribute("data-maki");
					s.makiColor = tour_stop.getAttribute("data-maki-color");
					s.mbKey = tour_stop.getAttribute("data-mb-key");
					s.postId = tour_stop.getAttribute("data-post-id");
					s.background = tour_stop.getAttribute("data-background");
					if (tour_stop.querySelector(".pp-tour-stop-title").hasChildNodes()) {
						s.title = tour_stop.querySelector(
							".pp-tour-stop-title"
						).children[0].innerText;
					}
					s.infowindow =
						tour_stop.getAttribute("data-infowindow") &&
						tour_stop.getAttribute("data-infowindow").length
							? decodeURI(tour_stop.getAttribute("data-infowindow"))
							: s.lat && s.lon
							? s.lat + "," + s.lon
							: "";
					if (s.lat && s.lon) {
						settings[i] = s;
						tour_stop.setAttribute("id", "pp_" + i);
					}
				});
			}
			return settings.length ? settings : false;
		};

		// Element is in Viewport
		const isInViewport = (elem) => {
			var bounding = elem.getBoundingClientRect();
			return (
				bounding.top >= 0 &&
				bounding.left >= 0 &&
				bounding.bottom <=
					(window.innerHeight || document.documentElement.clientHeight) &&
				bounding.right <=
					(window.innerWidth || document.documentElement.clientWidth)
			);
		};

		const getArchiveLocationType = () => {
			let path = window.location.href.replace(defaults.site_url, "").split("/");
			let slugs = path.filter((s) => {
				return s.length ? s : null;
			});
			// example.com/location-types/cities => returns cities
			let t = slugs[0] == "location-type" ? slugs[1] || false : false;
			return t;
		};

		const addMarkers = (map, data, markers, location_type, previous_zoom) => {
			data
				.filter((data) =>
					location_type ? data.type.includes(location_type) : data
				)
				.forEach(function (post) {
					const coords = post.api_coordinates_pp.split(",");
					if (coords.length == 2) {
						const marker = L.marker(coords, {
							icon: divIcon,
							id: post.id,
							title: post.title,
							permalink: post.permalink,
							coords: coords,
							thumbnail: post.thumbnail,
						});
						const popupShow = (e) => {
							const popup = L.popup().setContent(
								'<a href="' +
									e.target.options.permalink +
									'" class="map-thumb" style="background-image:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.7) 70%,rgba(0,0,0,1) 100%),url(' +
									e.target.options.thumbnail +
									')">' +
									'<span class="map-title" href="' +
									e.target.options.permalink +
									'">' +
									e.target.options.title +
									"</span>" +
									"</a>"
							);
							e.target.unbindPopup().bindPopup(popup).openPopup();
						};
						// user actions: CLICK
						marker.on("click", function (e) {
							popupShow(e);
						});
						marker.on("keydown", function (e) {
							if ("key" in e.originalEvent && e.originalEvent.key === "Enter") {
								popupShow(e);
							}
						});
						markers.push(marker);

						// vertical center on popup open
						map.on("popupopen", function (e) {
							const px = map.project(e.popup._latlng);
							px.y -= e.popup._container.clientHeight / 2;
							map.panTo(map.unproject(px), { animate: true });
						});
					}
				});
			if (markers.length) {
				let options = { padding: [60, 60] };
				if (previous_zoom) {
					// maintain current zoom on type change for UX reasons
					// @todo: this may need to be a plugin option?
					options.maxZoom = previous_zoom;
				}
				if (typeof L.markerClusterGroup === "function") {
					const clusterGroup = L.markerClusterGroup({
						zoomToBoundsOnClick: true
					});
					clusterGroup.addLayers(markers).addTo(map);
					map.fitBounds(clusterGroup.getBounds(), options);
				} else {
					const markersGroup = L.featureGroup(markers).addTo(map);
					map.fitBounds(markersGroup.getBounds(), options);
				}
			} else {
				console.warn(
					"PlacePress: The Global Map block returned no results. Please edit this post for more details."
				);
			}
		};

		// API XMLHttpRequest
		const buildGlobalMapUI = (map, settings, tileSets) => {
			const markers = [];
			const location_type = settings.locationType || getArchiveLocationType();
			const locations_json =
				defaults.site_url + "?feed=placepress_locations_public";
			const request = new XMLHttpRequest();
			request.open("GET", locations_json, true);
			request.onload = function () {
				if (request.status >= 200 && request.status < 400) {
					let data = JSON.parse(this.response);
					if (typeof data !== "undefined" && data.length > 0) {
						// Add Markers
						addMarkers(map, data, markers, location_type);

						if (settings.locationTypeSelection == "true") {
							// controls/user actions: SELECT Location Type
							locationTypeUserSelectControls(map, data, location_type);
						}

						// additional controls
						addAdditionalControls(tileSets, map);
					} else {
						console.warn(
							"PlacePress: Your request did not return any public Locations. Please ensure that you have published Location posts that use the PlacePress Location Map block."
						);
					}
				} else {
					console.warn(
						"PlacePress: There was an error fetching Location posts using the WordPress REST API. Please check your network connection and try again."
					);
				}
			};
			request.send();
		};

		// User Type Select Control
		const locationTypeUserSelectControls = (map, data, location_type) => {
			// Get Types/Categories
			let select_options = [];
			data.forEach((d) => {
				d.type.forEach((t) => {
					select_options.push(t);
				});
			});
			select_options = [...new Set(select_options)];
			select_options.sort();
			L.Control.CategorySelect = L.Control.extend({
				onAdd: function (map) {
					const container = L.DomUtil.create("div", "category-select-pp");
					const select = L.DomUtil.create(
						"select",
						"select-pp leaflet-touch",
						container
					);
					select.tabindex = "0";

					// empty/hidden optgroup req. for iOS Safari to detect onchange
					const optgroup = L.DomUtil.create("optgroup", "optgroup-pp", select);
					optgroup.setAttribute("disabled", "");
					optgroup.setAttribute("hidden", "");

					// Default selection: all
					const option = L.DomUtil.create("option", "option-pp", select);
					option.setAttribute("value", "");
					option.innerHTML = defaults.all_location_types_label;

					// Location Type selections
					let add_opt = null;
					select_options.forEach((opt) => {
						add_opt = L.DomUtil.create("option", "editor-option-pp", select);

						if (location_type === opt) {
							add_opt.setAttribute("selected", "");
						}

						let name = opt
							.split("-")
							.map((word) => {
								return word[0].toUpperCase() + word.substr(1);
							})
							.join(" ");
						add_opt.setAttribute("value", opt);
						add_opt.innerHTML = name;
					});

					// on new type selection...
					select.onchange = (e) => {
						map.dragging.disable(); // prevent accidental map grab & drag

						let previous_zoom = map.getZoom();
						let selected_type = e.target.selectedOptions[0].value;

						// remove current markers
						map.eachLayer((layer) => {
							if (typeof layer._featureGroup !== "undefined") {
								// remove single feature group (clusters)
								map.removeLayer(layer);
							} else if (typeof layer._latlng !== "undefined") {
								// remove multiple marker layers (not clustered)
								map.removeLayer(layer);
							}
						});
						// add selected markers
						addMarkers(map, data, [], selected_type, previous_zoom);
						map.dragging.enable();
					};

					return container;
				},

				onRemove: function () {
					// Nothing to do here
				},
			});
			L.control.categoryselect = function (opts) {
				return new L.Control.CategorySelect(opts);
			};
			L.control.categoryselect({ position: "topright" }).addTo(map);
		};

		// Fit Bounds Control
		const fitBoundsControls = (map, bounds) => {
			const fitBoundsControl = L.control({ position: "bottomleft" });
			fitBoundsControl.onAdd = (map) => {
				const div = L.DomUtil.create(
					"div",
					"leaflet-control leaflet-control-bounds"
				);
				const btn = L.DomUtil.create("a", "placepress-bounds", div);
				btn.title = "Fit All Markers";
				btn.tabIndex = "0";
				btn.setAttribute("role", "button");
				const icn =
					'<svg id="bounds" height="30px" width="30px" viewBox="0 0 1024 1024"  xmlns="http://www.w3.org/2000/svg"><path height="35" width="35" d="M396.795 396.8H320V448h128V320h-51.205zM396.8 115.205V192H448V64H320v51.205zM115.205 115.2H192V64H64v128h51.205zM115.2 396.795V320H64v128h128v-51.205z"/></svg>';
				btn.innerHTML = icn;

				btn.onclick = () => {
					map.fitBounds(bounds);
				};

				btn.onkeydown = (e) => {
					if ("key" in e && e.key === "Enter") {
						map.fitBounds(bounds);
					}
				};

				return div;
			};
			fitBoundsControl.addTo(map);
		};

		// Geolocation Controls
		const geolocationControls = (map) => {
			const geolocationControl = L.control({ position: "bottomleft" });
			geolocationControl.onAdd = (map) => {
				const div = L.DomUtil.create(
					"div",
					"leaflet-control leaflet-control-geolocation"
				);
				const btn = L.DomUtil.create("a", "placepress-geolocation", div);
				btn.title = "Geolocation";
				btn.tabIndex = "0";
				btn.setAttribute("role", "button");
				const icn =
					'<svg id="geolocation" height="30px" width="30px" viewBox="0 0 1024 1024"  xmlns="http://www.w3.org/2000/svg"><path id="inner" d="m512.001 302.46c-115.762 0-209.541 93.808-209.541 209.541 0 115.761 93.779 209.541 209.541 209.541 115.819 0 209.538-93.779 209.538-209.541 0-115.733-93.719-209.541-209.538-209.541z"/><path id="outer" d="m838.411 482.066c-14.439-157.447-138.854-281.92-296.476-296.274v-122.806h-59.869v122.807c-157.622 14.353-282.036 138.826-296.478 296.273h-122.602v59.869h122.602c14.442 157.389 138.856 281.861 296.479 296.302v122.777h59.869v-122.777c157.621-14.44 282.036-138.913 296.476-296.302h122.603v-59.869zm-326.41 299.341c-148.736 0-269.409-120.671-269.409-269.407 0-148.766 120.673-269.409 269.409-269.409 148.792 0 269.406 120.644 269.406 269.409 0 148.737-120.614 269.407-269.406 269.407z"/></svg>';

				btn.innerHTML = icn;
				let userMarker;
				const geolocationAction = () => {
					navigator.geolocation.getCurrentPosition((pos) => {
						const userLocation = [pos.coords.latitude, pos.coords.longitude];
						// remove existing user marker if there is one
						// not simply updating its location due to marker/layer reset on type select
						if (typeof userMarker !== "undefined") {
							map.removeLayer(userMarker);
						}
						// user location indicator
						let circle = new L.circleMarker(userLocation, {
							title: "Geolocation",
							radius: 8,
							fillColor: "#4a87ee",
							color: "#ffffff",
							weight: 3,
							opacity: 1,
							fillOpacity: 0.8,
						});
						userMarker = L.featureGroup([circle]).addTo(map);

						const mapBounds = map.getBounds();
						const newBounds = new L.LatLngBounds(
							mapBounds,
							new L.LatLng(pos.coords.latitude, pos.coords.longitude)
						);
						map.fitBounds(newBounds);

						map.flyTo(
							[pos.coords.latitude, pos.coords.longitude],
							map.getZoom() + 1
						);
					});
				};

				btn.onclick = () => {
					geolocationAction();
				};

				btn.onkeydown = (e) => {
					if ("key" in e && e.key === "Enter") {
						geolocationAction();
					}
				};

				return div;
			};
			geolocationControl.addTo(map);
		};

		// Standalone Marker (not for Global Map)
		const addSingleMarker = (settings, map, isTour, openPopup = false) => {
			const marker = new L.marker([settings.lat, settings.lon], { icon: divIcon }).addTo(map);
			marker._icon.setAttribute("role", "button");
			let title =
				settings.title && isTour
					? '<div class="pp-title">' + settings.title + "</div>"
					: "";
			let content =
				'<div class="pp-container ' +
				(isTour ? "tour" : "") +
				'" style="background-image:linear-gradient(to bottom,rgba(0,0,0,0),rgba(256,256,256,.65) 30%,rgba(256,256,256,1) 50%),url(' +
				(settings.background || "") +
				')">' +
				title +
				'<a class="pp-directions-button" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' +
				settings.lat +
				"," +
				settings.lon +
				'">Get Directions</a>' +
				'<div class="pp-coords-caption">' +
				settings.infowindow.substring(0, 100) +
				"</div>" +
				"</div>";

			// vertical center on popup open
			map.on("popupopen", (e) => {
				const px = map.project(e.popup._latlng);
				px.y -= e.popup._container.clientHeight / 2;
				map.panTo(map.unproject(px), { animate: true });
			});

			// auto open as needed
			if (openPopup) {
				setTimeout(() => {
					marker.bindPopup(content).openPopup();
				}, 300);
			}

			// open on click
			marker.on("click", (e) => {
				let popup = L.popup().setContent(content);
				e.target.unbindPopup().bindPopup(popup).openPopup();
			});
			marker.on("keydown", (e) => {
				if ("key" in e.originalEvent && e.originalEvent.key === "Enter") {
					let popup = L.popup().setContent(content);
					e.target.unbindPopup().bindPopup(popup).openPopup();
				}
			});
		};

		// Adds controls: geolocation and layers
		const addAdditionalControls = (tileSets, map, bounds = null) => {
			// layer controls
			const layerNames = {
				"Street (Carto Voyager)": tileSets.carto_voyager,
				"Street (Carto Light)": tileSets.carto_light,
				"Terrain (Stamen)": tileSets.stamen_terrain,
				"Satellite (ESRI)": tileSets.esri_world,
			};
			L.control.layers(layerNames).addTo(map);
			// geolocation controls
			const isSecure = window.location.protocol == "https:" ? true : false;
			if (isSecure && navigator.geolocation) {
				geolocationControls(map);
			}
			// fit bounds controls
			if (bounds) {
				fitBoundsControls(map, bounds);
			}
		};

		// FLOATING TOUR MAP
		const updateFloatingMapPP = (
			settings,
			current,
			tileSets,
			fitBounds = false
		) => {
			var bounds = new L.LatLngBounds();

			map = L.map("floating-tour-map-pp", {
				scrollWheelZoom: false,
				layers: tileSets[settings[current].style],
			}).setView(
				[settings[current].lat, settings[current].lon],
				settings[current].zoom
			);

			settings.forEach((marker, i) => {
				addSingleMarker(marker, map, true, i == active_index);
				bounds.extend([marker.lat, marker.lon]);
			});

			if (fitBounds) {
				map.fitBounds(bounds);
			}

			addAdditionalControls(tileSets, map, bounds);

			return map;
		};

		const displayFloatingMapPP = (settings) => {
			let initial = true; // default view is fit bounds
			let current = 0;
			let inview = 0;
			let map = null;
			const shape =
				typeof defaults.tours_floating_map_display !== undefined
					? String(defaults.tours_floating_map_display)
					: "circle";
			const tileSets = window.getMapTileSets();

			const floater = document.createElement("div");
			floater.setAttribute("id", "floating-tour-map-pp");
			floater.setAttribute("class", shape);

			const openFloatingMapPP = new Event("openFloatingMapPP");
			floater.addEventListener("openFloatingMapPP", (e) => {
				active_index = !initial ? current : null;
				e.target.setAttribute("class", "enhance");
				map.remove();
				setTimeout(() => {
					map = updateFloatingMapPP(settings, current, tileSets, initial);
				}, 501);
			});

			const closeFloatingMapPP = new Event("closeFloatingMapPP");
			floater.addEventListener("closeFloatingMapPP", (e) => {
				active_index = null;
				e.target.removeAttribute("class", "enhance");
				e.target.setAttribute("class", shape);
				map.remove();
				setTimeout(() => {
					map = updateFloatingMapPP(settings, current, tileSets, initial);
				}, 501);
			});

			floater.onclick = () => {
				if (!floater.classList.contains("enhance")) {
					floater.dispatchEvent(openFloatingMapPP);
					floater.focus();
				}
			};

			const close = document.createElement("div");
			close.setAttribute("id", "close-floating-tour-map-pp");
			close.setAttribute("tabindex", "0");
			close.innerHTML = "Close Map";
			close.onclick = () => {
				if (floater.classList.contains("enhance")) {
					floater.dispatchEvent(closeFloatingMapPP);
				}
			};
			close.onkeydown = (e) => {
				if ("key" in e && e.key === "Enter") {
					floater.dispatchEvent(closeFloatingMapPP);
				}
			};

			const backdrop = document.createElement("div");
			backdrop.setAttribute("id", "backdrop-floating-tour-map-pp");
			backdrop.onclick = () => {
				if (floater.classList.contains("enhance")) {
					floater.dispatchEvent(closeFloatingMapPP);
				}
			};

			document.onkeydown = (e) => {
				if (floater.classList.contains("enhance")) {
					if ("key" in e && (e.key === "Escape" || e.key === "Esc")) {
						floater.dispatchEvent(closeFloatingMapPP);
					}
				}
			};

			document.querySelector("body").append(floater, close, backdrop);

			const map_icons = document.querySelectorAll(
				".pp-marker-icon-center.has-map"
			);
			map_icons.forEach((icon, i) => {
				icon.firstChild.setAttribute("tabindex", "0"); // svg
				const tourMapAction = () => {
					current = i;
					if (!floater.classList.contains("enhance")) {
						active_index = Number(
							icon.parentElement.getAttribute("id").replace("pp_", "")
						);
						floater.dispatchEvent(openFloatingMapPP);
					}
					floater.focus();
				};
				icon.firstChild.onkeydown = (e) => {
					// icon > svg: focus => enter
					if ("key" in e && e.key === "Enter") {
						tourMapAction();
					}
				};
				icon.onclick = () => {
					tourMapAction();
				};
			});

			map = updateFloatingMapPP(settings, current, tileSets, true);

			const stops = document.querySelectorAll(
				".pp-tour-stop-section-header-container"
			);

			window.addEventListener(
				"scroll",
				() => {
					stops.forEach((stop) => {
						if (isInViewport(stop)) {
							inview = Number(stop.getAttribute("id").replace("pp_", ""));
							if (initial == true || inview !== current) {
								map.invalidateSize();
								map.setView(
									[settings[inview].lat, settings[inview].lon],
									settings[inview].zoom
								);
								if (settings[current].style !== settings[inview].style) {
									map.removeLayer(tileSets[settings[current].style]);
									map.addLayer(tileSets[settings[inview].style]);
								}
								initial = false;
								current = inview;
							}
						} else if (this.scrollY == 0) {
							initial = true;
							current = 0;
							inview = 0;
							map.remove();
							map = updateFloatingMapPP(settings, current, tileSets, initial);
						}
					});
				},
				false
			);
		};

		// SINGLE LOCATION MAP
		const displayLocationMapPP = (settings) => {
			const tileSets = window.getMapTileSets();
			const basemap = tileSets[settings.style];

			if (settings) {
				const map = L.map(settings.mapId, {
					scrollWheelZoom: false,
					layers: basemap,
				}).setView([settings.lat, settings.lon], settings.zoom);

				// enable scrollwheel zoom if user interacts with the map
				map.on("focus", () => {
					map.scrollWheelZoom.enable();
				});
				map.on("blur", () => {
					map.scrollWheelZoom.disable();
				});

				addSingleMarker(settings, map, false, false);

				addAdditionalControls(tileSets, map);
			}
		};

		// GLOBAL LOCATIONS MAP
		const displayGlobalMapPP = (settings) => {
			const tileSets = window.getMapTileSets();
			const currentTileSet = tileSets[settings.style];
			// const markersLayer = [];
			const map = L.map(settings.mapId, {
				layers: currentTileSet,
				scrollWheelZoom: false,
			}).setView([settings.lat, settings.lon], settings.zoom);

			// enable scrollwheel zoom if user interacts with the map
			map.on("focus", () => {
				map.scrollWheelZoom.enable();
			});
			map.on("blur", () => {
				map.scrollWheelZoom.disable();
			});

			// API fetch, add location markers, controls, etc
			buildGlobalMapUI(map, s, tileSets);
		};

		// MAIN
		if (window.location.href.indexOf("wp-admin") < 0) {
			const page = document.querySelector("body").classList;
			if ((settings = getDataAttributesPPLocation())) {
				// LOCATIONS
				settings.forEach((s) => {
					if (s.type == "single-location") {
						displayLocationMapPP(s);
					} else {
						// s.type: "global" || "archive"
						displayGlobalMapPP(s);
					}
				});
			} else if ((settings = getDataAttributesPPTour())) {
				// TOURS
				if (page.length && page.contains("single") && settings.length) {
					// single tour
					setTimeout(() => {
						displayFloatingMapPP(settings);
					}, 1000);
				} else if (page.length && page.contains("archive") && settings.length) {
					// tours archive
					let redirect_wrappers = document.querySelectorAll(
						"div[data-redirect-to-post-id]"
					);
					redirect_wrappers.forEach((w) => {
						let pid = w.getAttribute("data-redirect-to-post-id");
						w.setAttribute("tabindex", "0");
						let url = defaults.site_url + "?page_id=" + pid;
						w.onclick = () => {
							window.location = url;
						};
						w.onkeydown = (e) => {
							if ("key" in e && e.key === "Enter") {
								window.location = url;
							}
						};
					});
				} else {
					if (settings.length) {
						console.warn(
							"Unknown tour page. PlacePress scripts will not load.",
							"\n\nPlease ensure that your body tag includes default classes, including 'single' (for individual tour pages) and 'archive' (for the tours post type archive).",
							"\n\nSee: https://developer.wordpress.org/reference/functions/body_class/"
						);
					}
				}
			}
		}
	})();
});
