// @ts-nocheck
(function blocker() {
  "use strict";
  const has = Object.prototype.hasOwnProperty;
  const isMobileInterface = document.location.hostname.startsWith("m.");

  // !! Trap a property chain on `window` (intercepts ytInitial* before YT assigns)
  const defineProperty = function (chain, cValue, middleware = undefined) {
    let aborted = false;
    const mustAbort = (v) => {
      if (aborted) return true;
      aborted =
        v !== undefined &&
        v !== null &&
        cValue !== undefined &&
        cValue !== null &&
        typeof v !== typeof cValue;
      return aborted;
    };
    const trapProp = (owner, prop, configurable, handler) => {
      if (handler.init(owner[prop]) === false) return;
      const odesc = Object.getOwnPropertyDescriptor(owner, prop);
      let prevGetter, prevSetter;
      if (odesc instanceof Object) {
        if (odesc.configurable === false) return;
        if (odesc.get instanceof Function) prevGetter = odesc.get;
        if (odesc.set instanceof Function) prevSetter = odesc.set;
      }
      Object.defineProperty(owner, prop, {
        configurable,
        get() {
          if (prevGetter !== undefined) prevGetter();
          return handler.getter();
        },
        set(a) {
          if (prevSetter !== undefined) prevSetter(a);
          handler.setter(a);
        },
      });
    };
    const trapChain = (owner, c) => {
      const pos = c.indexOf(".");
      if (pos === -1) {
        trapProp(owner, c, true, {
          v: undefined,
          init(v) {
            if (mustAbort(v)) return false;
            this.v = v;
            return true;
          },
          getter() {
            return cValue;
          },
          setter(a) {
            if (middleware instanceof Function) {
              cValue = a;
              middleware(a);
            } else if (mustAbort(a) === false) {
              cValue = a;
            }
          },
        });
        return;
      }
      const prop = c.slice(0, pos);
      const v = owner[prop];
      const rest = c.slice(pos + 1);
      if (v instanceof Object || (typeof v === "object" && v !== null)) {
        trapChain(v, rest);
        return;
      }
      trapProp(owner, prop, true, {
        v: undefined,
        init(v2) {
          this.v = v2;
          return true;
        },
        getter() {
          return this.v;
        },
        setter(a) {
          this.v = a;
          if (a instanceof Object) trapChain(a, rest);
        },
      });
    };
    trapChain(window, chain);
  };

  // !! Globals
  window.bkReloadRequired = false;
  let channelPatterns; // RegExp[] | undefined

  // Renderer types where we inject the "Block Channel" context-menu entry.
  const contextMenuObjects = [
    "backstagePostRenderer",
    "postRenderer",
    "videoRenderer",
    "gridVideoRenderer",
    "compactVideoRenderer",
    "commentRenderer",
    "playlistPanelVideoRenderer",
    "playlistVideoRenderer",
    "lockupViewModel",
    "videoCardRenderer",
    "videoWithContextRenderer",
    "slimVideoMetadataSectionRenderer",
  ];

  // Containers safe to delete when their child got filtered out.
  const deleteAllowed = [
    "richItemRenderer",
    "content",
    "horizontalListRenderer",
    "verticalListRenderer",
    "shelfRenderer",
    "richShelfRenderer",
    "gridRenderer",
    "expandedShelfContentsRenderer",
    "comment",
    "commentThreadRenderer",
    "reelShelfRenderer",
    "richSectionRenderer",
  ];

  // !! Per-renderer paths to the channel-name field. Filtering matches the
  // user's regex blocklist against the value at these paths.
  const baseRules = {
    channelName: ["shortBylineText", "longBylineText"],
  };

  const filterRules = {
    main: {
      gridVideoRenderer: baseRules,
      videoRenderer: baseRules,
      radioRenderer: baseRules,
      playlistRenderer: baseRules,
      gridRadioRenderer: baseRules,
      compactVideoRenderer: baseRules,
      compactRadioRenderer: baseRules,
      playlistVideoRenderer: baseRules,
      endScreenVideoRenderer: baseRules,
      endScreenPlaylistRenderer: baseRules,
      gridPlaylistRenderer: baseRules,
      postRenderer: { channelName: ["authorText"] },
      backstagePostRenderer: { channelName: ["authorText"] },
      watchCardCompactVideoRenderer: { channelName: "subtitles" },
      channelRenderer: baseRules,
      playlistPanelVideoRenderer: baseRules,
      videoSecondaryInfoRenderer: {
        channelName: "owner.videoOwnerRenderer.title",
      },
      channelMetadataRenderer: { channelName: "title" },
      gridChannelRenderer: { channelName: "title" },
      miniChannelRenderer: { channelName: "title" },
      guideEntryRenderer: { channelName: ["title", "formattedTitle"] },
      universalWatchCardRenderer: {
        channelName: "header.watchCardRichHeaderRenderer.title",
      },
      playlist: { channelName: ["shortBylineText"] },
      compactChannelRecommendationCardRenderer: {
        channelName: ["channelTitle"],
      },
      channelFeaturedVideoRenderer: baseRules,
      videoWithContextRenderer: baseRules,
      compactChannelRenderer: { channelName: "displayName" },
      lockupViewModel: {
        channelName:
          "metadata.lockupMetadataViewModel.metadata.contentMetadataViewModel.metadataRows.metadataParts.text.content",
      },
      videoCardRenderer: { channelName: "bylineText" },
      slimVideoMetadataSectionRenderer: {
        channelName: "contents.slimOwnerRenderer.title",
      },
    },
    guide: {
      guideEntryRenderer: { channelName: ["title", "formattedTitle"] },
    },
    comments: {
      commentEntityPayload: { channelName: ["author.displayName"] },
      commentRenderer: { channelName: ["authorText"] },
      liveChatTextMessageRenderer: { channelName: ["authorName"] },
    },
  };

  const mergedFilterRules = Object.assign(
    {},
    filterRules.main,
    filterRules.comments,
  );

  // !! Utils

  function flattenRuns(arr) {
    if (arr.simpleText !== undefined) return arr.simpleText;
    if (!(arr.runs instanceof Array)) return arr;
    return arr.runs
      .reduce((res, v) => {
        if (has.call(v, "text")) res.push(v.text);
        return res;
      }, [])
      .join(" ");
  }

  function getObjectByPath(obj, path, def = undefined) {
    const paths = path instanceof Array ? path : path.split(".");
    let nextObj = obj;

    const exist = paths.every((v) => {
      if (/\[.*\]/.test(v)) {
        const parts = [];
        const baseMatch = v.match(/^([^\[]+)/);
        if (baseMatch && baseMatch[1]) parts.push(baseMatch[1]);
        const idxMatches = [...v.matchAll(/\[(\d+)\]/g)].map((m) =>
          parseInt(m[1], 10),
        );
        for (const key of parts) {
          if (!nextObj || !has.call(nextObj, key)) return false;
          nextObj = nextObj[key];
        }
        for (const idx of idxMatches) {
          if (!Array.isArray(nextObj) || idx < 0 || idx >= nextObj.length)
            return false;
          nextObj = nextObj[idx];
        }
        return true;
      }

      if (nextObj instanceof Array) {
        const found = nextObj.find((o) => has.call(o, v));
        if (found === undefined) return false;
        nextObj = found[v];
      } else {
        if (!nextObj || !has.call(nextObj, v)) return false;
        nextObj = nextObj[v];
      }
      return true;
    });

    return exist ? nextObj : def;
  }

  function getFlattenByPath(obj, filterPath) {
    if (filterPath === undefined) return;
    const arr = filterPath instanceof Array ? filterPath : [filterPath];
    for (const p of arr) {
      const value = getObjectByPath(obj, p);
      if (value !== undefined) return flattenRuns(value);
    }
  }

  function postMessage(type, data) {
    window.postMessage(
      { from: "BLOCKED_PAGE", type, data },
      document.location.origin,
    );
  }

  // !! ObjectFilter — recursively walks YouTube data, removing matched renderers.
  function ObjectFilter(object, rules, contextMenus = false) {
    if (!(this instanceof ObjectFilter))
      return new ObjectFilter(object, rules, contextMenus);
    this.object = object;
    this.filterRules = rules;
    this.contextMenus = contextMenus;
    this.filter();
    return this;
  }

  ObjectFilter.prototype.shouldBlock = function (props, obj) {
    if (!channelPatterns || channelPatterns.length === 0) return false;
    const path = props.channelName;
    if (path === undefined) return false;
    const value = getFlattenByPath(obj, path);
    if (value === undefined) return false;
    return channelPatterns.some((re) => re.test(value));
  };

  ObjectFilter.prototype.matchFilterRule = function (obj) {
    if (!channelPatterns || channelPatterns.length === 0) return [];
    return Object.keys(this.filterRules).reduce((res, h) => {
      const filteredObject = obj[h];
      if (!filteredObject) return res;
      const rule = this.filterRules[h];
      if (this.shouldBlock(rule, filteredObject)) res.push({ name: h });
      return res;
    }, []);
  };

  ObjectFilter.prototype.filter = function (obj = this.object) {
    let deletePrev = false;
    if (typeof obj !== "object" || obj === null) return deletePrev;

    const matched = this.matchFilterRule(obj);
    matched.forEach((r) => {
      delete obj[r.name];
      deletePrev = true;
    });

    let keys;
    let len;
    if (obj instanceof Array) {
      len = obj.length;
    } else {
      keys = Object.keys(obj);
      len = keys.length;
    }

    for (let i = len - 1; i >= 0; i -= 1) {
      const idx = keys ? keys[i] : i;
      if (obj[idx] === undefined) continue;

      const childDel = this.filter(obj[idx]);
      if (childDel && keys === undefined) {
        deletePrev = true;
        obj.splice(idx, 1);
      }

      if (obj[idx] instanceof Array && obj[idx].length === 0 && childDel) {
        deletePrev = true;
      } else if (childDel && deleteAllowed.includes(idx)) {
        delete obj[idx];
        deletePrev = true;
      }
    }

    if (this.contextMenus)
      isMobileInterface ? addContextMenusMobile(obj) : addContextMenus(obj);
    return deletePrev;
  };

  // !! Hook entrypoints called by seed.ts via window.bkExports

  function fetchFilter(url, resp) {
    if (channelPatterns === undefined) return;
    if (["/youtubei/v1/search", "/youtubei/v1/browse"].includes(url.pathname)) {
      ObjectFilter(resp, filterRules.main, true);
    } else if (url.pathname === "/youtubei/v1/next") {
      ObjectFilter(resp, mergedFilterRules, true);
    } else if (url.pathname === "/youtubei/v1/guide") {
      ObjectFilter(resp, filterRules.guide, true);
    }
  }

  function spfFilter(url, resp) {
    if (channelPatterns === undefined) return;
    let arr = resp.part || resp.response?.parts || resp.response;
    arr = arr instanceof Array ? arr : [arr];

    arr.forEach((obj) => {
      if (has.call(obj, "response") || has.call(obj, "data")) {
        let rules = filterRules.main;
        if (url.pathname === "/guide_ajax") {
          rules = filterRules.guide;
        } else if (
          url.pathname === "/comment_service_ajax" ||
          url.pathname === "/live_chat/get_live_chat"
        ) {
          rules = filterRules.comments;
        }
        ObjectFilter(obj.response || obj.data, rules, true);
      }
    });
  }

  // !! Context menu injection — "Block Channel" only.

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function addContextMenusMobile(obj) {
    const attr = contextMenuObjects.find((e) => has.call(obj, e));
    if (attr === undefined) return;

    const parentData = obj[attr];
    const searchIn = mergedFilterRules[attr]?.properties
      ? mergedFilterRules[attr].properties
      : mergedFilterRules[attr];
    if (!searchIn) return;

    const channelText = getFlattenByPath(parentData, searchIn.channelName);
    if (!channelText) return;

    if (
      [
        "videoWithContextRenderer",
        "compactVideoRenderer",
        "playlistVideoRenderer",
        "commentRenderer",
      ].includes(attr)
    ) {
      let items;
      if (has.call(obj[attr], "menu")) {
        items = getObjectByPath(obj[attr], "menu.menuRenderer.items");
      }
      if (has.call(obj[attr], "actionMenu")) {
        items = obj[attr].actionMenu.menuRenderer.items;
      } else if (attr === "commentRenderer") {
        obj[attr].actionMenu = { menuRenderer: { items: [] } };
        items = obj[attr].actionMenu.menuRenderer.items;
      }
      if (!items) return;
      items.push(mobileBlockChannelItem(attr, channelText));
    } else if (attr === "slimVideoMetadataSectionRenderer") {
      const items = obj[attr].contents;
      if (!items) return;
      items.splice(2, 0, mobileVideoPageBlockMenu(attr, channelText));
    }
  }

  function mobileBlockChannelItem(attr, channelText) {
    return {
      menuServiceItemRenderer: {
        _bkOriginalAttr: attr,
        _bkOriginalText: channelText,
        text: { runs: [{ text: "Block Channel" }] },
        icon: { iconType: "NOT_INTERESTED" },
        trackingParams: "Cg==",
        serviceEndpoint: {
          commandMetadata: {
            webCommandMetadata: {
              sendPost: true,
              apiUrl: "data:text/plain;base64,Cg==",
            },
          },
          feedbackEndpoint: {
            uiActions: { hideEnclosingContainer: true },
            actions: [
              {
                replaceEnclosingAction: {
                  item: {
                    notificationMultiActionRenderer: {
                      responseText: {
                        runs: [{ text: "Channel blocked" }],
                        accessibility: {
                          accessibilityData: { label: "Channel blocked" },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
  }

  function mobileVideoPageBlockMenu(attr, channelText) {
    return {
      slimVideoActionBarRenderer: {
        buttons: [
          {
            slimMetadataButtonRenderer: {
              button: {
                buttonRenderer: {
                  _bkOriginalAttr: attr,
                  _bkOriginalText: channelText,
                  style: "STYLE_DEFAULT",
                  size: "SIZE_DEFAULT",
                  isDisabled: false,
                  text: { runs: [{ text: "Block Channel" }] },
                  accessibility: { label: "Block Channel" },
                  accessibilityData: {
                    accessibilityData: { label: "Block Channel" },
                  },
                  navigationEndpoint: {
                    commandMetadata: {
                      webCommandMetadata: { ignoreNavigation: true },
                    },
                    urlEndpoint: {},
                  },
                },
              },
            },
          },
        ],
        overflowMenuText: { runs: [{ text: "More" }] },
        overflowAccessibilityData: { label: "More" },
      },
    };
  }

  function addContextMenus(obj) {
    const attr = contextMenuObjects.find((e) => has.call(obj, e));
    if (!attr) return;

    const result = extractMenuItems(obj, attr);
    if (!result || !Array.isArray(result.items)) return;

    const { items, hasChannel, isLockupViewModel } = result;
    if (!hasChannel) return;

    if (isLockupViewModel) {
      injectLockupViewModelButton(items, obj[attr]);
    } else {
      items.push({
        menuServiceItemRenderer: {
          text: { runs: [{ text: "Block Channel" }] },
          icon: { iconType: "NOT_INTERESTED" },
        },
      });
    }

    obj[attr]._bkOriginalAttr = attr;
  }

  function extractMenuItems(obj, attr) {
    let items = null;
    let hasChannel = false;
    let isLockupViewModel = false;

    if (has.call(obj[attr], "videoActions")) {
      items = obj[attr].videoActions.menuRenderer.items;
      hasChannel = true;
    } else if (has.call(obj[attr], "actionMenu")) {
      items = obj[attr].actionMenu.menuRenderer.items;
      hasChannel = true;
    } else if (attr === "commentRenderer") {
      obj[attr].actionMenu = { menuRenderer: { items: [] } };
      items = obj[attr].actionMenu.menuRenderer.items;
      hasChannel = true;
    } else if (attr === "lockupViewModel") {
      items = extractFromLockupViewModel(obj[attr]);
      if (!items) return null;
      hasChannel = true;
      isLockupViewModel = true;
    } else {
      items = extractFromGenericRenderer(obj[attr]);
      if (
        has.call(obj[attr], "shortBylineText") &&
        getObjectByPath(
          obj[attr],
          "shortBylineText.runs.navigationEndpoint.browseEndpoint",
        )
      ) {
        hasChannel = true;
      } else if (
        has.call(obj[attr], "bylineText") &&
        getObjectByPath(
          obj[attr],
          "bylineText.runs.navigationEndpoint.browseEndpoint",
        )
      ) {
        hasChannel = true;
      }
    }

    return { items, hasChannel, isLockupViewModel };
  }

  function extractFromLockupViewModel(renderer) {
    const path =
      "metadata.lockupMetadataViewModel.menuButton.buttonViewModel.onTap.innertubeCommand.showSheetCommand.panelLoadingStrategy.inlineContent.sheetViewModel";
    const sheetmodel = getObjectByPath(renderer, path);
    if (!sheetmodel) return null;

    const items = sheetmodel.content?.listViewModel?.listItems;
    if (!items) return null;

    const searchIn = mergedFilterRules["lockupViewModel"];
    const channelName = getFlattenByPath(renderer, searchIn.channelName);

    Object.defineProperty(sheetmodel, "blocker", {
      value: { metadata: { channelName, removeObject: true } },
      writable: true,
      enumerable: true,
      configurable: true,
    });

    return items;
  }

  function extractFromGenericRenderer(renderer) {
    let items = getObjectByPath(renderer, "menu.menuRenderer.items");
    const topLevel = getObjectByPath(
      renderer,
      "menu.menuRenderer.topLevelButtons",
    );
    if (!items) {
      if (!topLevel) {
        renderer.menu = { menuRenderer: { items: [] } };
      } else {
        renderer.menu.menuRenderer.items = [];
      }
      items = renderer.menu.menuRenderer.items;
    }
    return items;
  }

  function injectLockupViewModelButton(items, currentObj) {
    if (!items.length) return;

    const baseContext = items[0]?.listItemViewModel?.rendererContext;
    if (!baseContext) return;

    const cleanContext = deepClone(baseContext);
    if (cleanContext.commandContext?.onTap) {
      cleanContext.commandContext.onTap.innertubeCommand = {
        clickTrackingParams: "",
        commandMetadata: {
          webCommandMetadata: { sendPost: false, apiUrl: "" },
        },
        feedbackEndpoint: {
          feedbackToken: "",
          uiActions: { hideEnclosingContainer: true },
          actions: [
            {
              clickTrackingParams: "",
              replaceEnclosingAction: {
                item: {
                  notificationMultiActionRenderer: {
                    responseText: {
                      accessibility: {
                        accessibilityData: { label: "Channel Blocked" },
                      },
                      simpleText: "Channel Blocked",
                    },
                    buttons: [],
                    trackingParams: "",
                    dismissalViewStyle: "DISMISSAL_VIEW_STYLE_COMPACT_TALL",
                  },
                },
              },
            },
          ],
          contentId: currentObj.contentId,
        },
      };
    }

    items.push({
      listItemViewModel: {
        title: { content: "Block Channel" },
        leadingImage: {
          sources: [{ clientResource: { imageName: "NOT_INTERESTED" } }],
        },
        rendererContext: cleanContext,
      },
    });
  }

  // !! Right-click handler. Posts the channel display name back to bridge.ts,
  // which adds it to the blocklist.

  function menuOnTap(event) {
    if (channelPatterns === undefined) return;

    const labelEl = this.getElementsByTagName("yt-formatted-string");
    const isFromRHS = !(labelEl && labelEl.length === 1);
    const menuAction = isFromRHS
      ? this.innerText || ""
      : labelEl[0]?.getRawText() || "";

    if (menuAction !== "Block Channel") {
      event.preventDefault();
      return;
    }

    if (window.bkReloadRequired) return;

    const { parentDom, parentData } = getParentDomAndData(isFromRHS, this);
    if (!parentDom) return;

    let text;
    let stopPlayer = false;

    if (
      parentDom.tagName === "YTD-VIDEO-PRIMARY-INFO-RENDERER" ||
      parentDom.tagName === "YTD-WATCH-METADATA"
    ) {
      const pageManager = document.getElementsByTagName("ytd-page-manager")[0];
      const playerData = pageManager.data || pageManager.getCurrentData();
      text = playerData.playerResponse?.videoDetails?.author;
      stopPlayer = true;
    } else if (isFromRHS) {
      text = parentData?.blocker?.metadata?.channelName;
    } else {
      const attrKey = parentData?._bkOriginalAttr;
      const searchIn =
        mergedFilterRules[attrKey]?.properties || mergedFilterRules[attrKey];
      if (searchIn) text = getFlattenByPath(parentData, searchIn.channelName);
    }

    if (!text) return;

    postMessage("contextBlockData", { text });

    if (
      !stopPlayer &&
      !isFromRHS &&
      parentDom.tagName !== "YTD-VIDEO-PRIMARY-INFO-RENDERER"
    ) {
      removeParentHelper(parentDom);
    } else if (stopPlayer) {
      document.getElementById("movie_player")?.stopVideo();
    }

    if (this.data?.serviceEndpoint) {
      if (this.onTap) this.onTap(event);
      else if (this.onTap_) this.onTap_(event);
    }
  }

  function getParentDomAndData(isFromRHS, element) {
    let parentDom;
    let parentData;

    if (isFromRHS) {
      parentDom =
        element?.parentElement?.parentElement?.parentElement?.parentElement;
      if (!parentDom) return {};
      const parentDomData = parentDom.componentProps?.data;
      if (!parentDomData) return {};
      const symbols = Object.getOwnPropertySymbols(parentDomData);
      if (symbols.length === 0) return {};
      parentData = parentDomData[symbols[0]]?.value;
    } else {
      const eventSink =
        getObjectByPath(
          element.parentElement?.parentElement,
          "polymerController.forwarder_.eventSink",
        ) ||
        getObjectByPath(element.parentElement, "__dataHost.eventSink_") ||
        getObjectByPath(
          element.parentElement,
          "__dataHost.forwarder_.eventSink",
        ) ||
        getObjectByPath(
          element.parentElement,
          "__dataHost.hostElement.inst.eventSink_",
        );
      if (!eventSink) return {};
      parentDom =
        eventSink.parentComponent ||
        eventSink.parentElement?.__dataHost?.hostElement ||
        eventSink.parentElement?.parentElement;
      parentData = parentDom?.data;
      if (!parentDom || !parentData) return {};
    }
    return { parentDom, parentData };
  }

  function removeParentHelper(parentDom) {
    if (
      ["YTD-BACKSTAGE-POST-RENDERER", "YTD-POST-RENDERER"].includes(
        parentDom.tagName,
      )
    ) {
      parentDom.parentNode?.remove();
    } else if (
      ["YTD-PLAYLIST-PANEL-VIDEO-RENDERER", "YTD-MOVIE-RENDERER"].includes(
        parentDom.tagName,
      )
    ) {
      parentDom.remove();
    } else if (parentDom.tagName === "YTD-COMMENT-RENDERER") {
      if (parentDom.parentNode?.tagName === "YTD-COMMENT-THREAD-RENDERER") {
        parentDom.parentNode.remove();
      } else {
        parentDom.remove();
      }
    } else {
      parentDom.dismissedRenderer = {
        notificationMultiActionRenderer: {
          responseText: { simpleText: "Blocked" },
        },
      };
      parentDom.setAttribute("is-dismissed", "");
    }
  }

  function menuOnTapMobile() {
    if (channelPatterns === undefined) return;
    if (window.bkReloadRequired) return;

    const data = getObjectByPath(this, "__instance.props.data") || this.data;
    const text = data?._bkOriginalText;
    if (!text) return;

    postMessage("contextBlockData", { text });

    if (data._bkOriginalAttr === "slimVideoMetadataSectionRenderer") {
      document.getElementById("movie_player")?.stopVideo();
      alert("Channel Blocked");
    }
  }

  // !! Initial-data hooks — wrap ytInitialGuideData / ytInitialData before YT assigns.

  function startHook() {
    if (
      typeof window.ytInitialGuideData === "object" &&
      window.ytInitialGuideData !== null
    ) {
      ObjectFilter(window.ytInitialGuideData, filterRules.guide);
    } else {
      defineProperty("ytInitialGuideData", undefined, (v) =>
        ObjectFilter(v, filterRules.guide),
      );
    }

    if (
      typeof window.ytInitialData === "object" &&
      window.ytInitialData !== null
    ) {
      ObjectFilter(window.ytInitialData, mergedFilterRules, true);
    } else {
      defineProperty("ytInitialData", undefined, (v) =>
        ObjectFilter(v, mergedFilterRules, true),
      );
    }

    window.bkDispatched = true;
    window.dispatchEvent(new Event("blockerReady"));
  }

  // !! Receive blocklist from bridge.ts and kick off the hook.

  function patternsReceived(data) {
    if (data === undefined) {
      channelPatterns = [];
      if (!window.bkDispatched) {
        window.bkDispatched = true;
        window.dispatchEvent(new Event("blockerReady"));
      }
      return;
    }

    const next = data
      .map(([src, flags]) => {
        try {
          return new RegExp(src, (flags || "").replace("g", ""));
        } catch (e) {
          console.error(`RegExp parse error: /${src}/${flags}`);
          return null;
        }
      })
      .filter(Boolean);

    const firstReceive = channelPatterns === undefined;
    channelPatterns = next;
    if (firstReceive && !window.bkDispatched) startHook();
  }

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) return;
      if (!event.data?.from || event.data.from !== "BLOCKED_CONTENT") return;
      if (event.data.type === "channelPatterns") {
        patternsReceived(event.data.data);
      } else if (event.data.type === "reloadRequired") {
        window.bkReloadRequired = true;
      }
    },
    true,
  );

  window.bkExports = {
    spfFilter,
    fetchFilter,
    menuOnTap,
    menuOnTapMobile,
  };
})();
