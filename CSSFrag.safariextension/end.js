// GLOBAL VARIABLES
var URL = "";

// HELPER FUNCTIONS

function dictionaryToSelector(dictionary) {
	//
	// Returns a dictionary's values as a concatenated string, removing the last character if it's ">".
	//
	
	var string = "";
	for (var key in dictionary) { string += dictionary[key]; }
	
	if (string[string.length - 1] === ">") { return string.substring(0, string.length - 1); }
	else { return string; }
}

function nthIndex(element) {
	//
	// Returns the element's DOM position amongst its children as an integer.
	//
	
	var nodes = element.parentNode.childNodes, node;
	var i = 0;
	var count = 1;
	
	while((node = nodes.item(i++)) && (node != element)) {
		if (node.nodeType == 1) {
			count++;
		}
	}
	
	return count;
}

function singleElementWithSelector(selector) {
	//
	// Returns true if the selector has only one corresponding element.
	//
	
	return (document.querySelectorAll(selector).length === 1);
}

function firstElementWithSelector(selector, element) {
	//
	// Returns true if the first element returned by the selector is the same as the given element.
	//
	
	return (document.querySelector(selector) === element);
}

function fixImageDimensionsRelatedToElement(element) {
	//
	// Given an element, walks up the tree from it, repairing any img nodes' height and width attributes if they weren't properly set.
	//
	
	var currentNode = element.parentNode;
	var imageDimensions = undefined;
	
	do {
		var children = currentNode.childNodes;
		
		for (child in children) {
			if (children[child].nodeType !== undefined && children[child].nodeName.toLowerCase() === 'img' && parseInt(getComputedStyle(children[child], null).height) === 0 && parseInt(getComputedStyle(children[child], null).width) === 0) {
					imageDimensions = new Image();
					imageDimensions.src = children[child].src;
					
					children[child].style.height = imageDimensions.height + "px !important";
					children[child].style.width = imageDimensions.width + "px !important";
			}
		}
	} while (currentNode = currentNode.parentNode);
}

function scrollFocusAndHighlight(selector, isFragHash, isSafe) {
	//
	// Given a selector and whether it is a frag hash, finds the element in the document and scrolls to it. If the user wants it, we also highlight the element and give it focus.
	//
	
	if (!isSafe) {
		var headID = document.getElementsByTagName("head")[0];
		var newScript = document.createElement('script');
		newScript.type = 'text/javascript';
		newScript.innerHTML = 'if (jQuery) {\n\
			var animating = 5;\n\
			animationCheck = setInterval(function() {\n\
				var animatedElements = $("*:animated").length;\n\
				if (animatedElements < 1) { animating = animating - 1; }\n\
				else { animating = animating + 1; }\n\
				if (animating < 1) {\n\
					window.clearInterval(animationCheck);\n\
					var event = document.createEvent("Event");\n\
					event.initEvent("animationFinished",true,true);\n\
					document.dispatchEvent(event);\n\
				}\n\
			}, 100);\n\
		}';
		headID.appendChild(newScript);
		
		return false;
	}
	
	if (document.querySelector("link[href='" + safari.extension.baseURI + "style.css']") === null) {
		var newStyles = document.createElement('link');
		newStyles.rel = 'stylesheet';
		newStyles.type = 'test/css';
		newStyles.href = safari.extension.baseURI + 'style.css';
		document.body.appendChild(newStyles);
	}
	
	var element = document.querySelector(selector);
	if (element === null) { return false; }
	
	fixImageDimensionsRelatedToElement(element);
	
	var boundingRect = element.getBoundingClientRect();
	
	var bounds = {
		'top': boundingRect.top + document.body.scrollTop,
		'left': boundingRect.left + document.body.scrollLeft,
		'height': boundingRect.height,
		'width': boundingRect.width
	};
	
	if (settings.highlightTarget !== 'none' && (settings.highlightTarget === 'all' || (isFragHash && settings.highlightTarget === 'frag'))) {
		var scroll = {
			'top': (bounds.top + (bounds.height / 2) - (window.innerHeight / 2)),
			'left': (bounds.left + (bounds.width / 2) - (window.innerWidth / 2))
		}
		window.scrollTo(scroll.left, scroll.top);
		
		var highlight = element.cloneNode(true);
		highlight.style.cssText = getComputedStyle(element, null).cssText;
		highlight.id = "CSSFragHighlight";
		highlight.className = "";
		
		highlight.style.height = getComputedStyle(element, null).height + " !important";
		highlight.style.width = getComputedStyle(element, null).width + " !important";
		
		var highlightBackground = document.createElement('div')
		highlightBackground.id='CSSFragHighlightBackground';
		highlightBackground.style.left = bounds.left - 5 + "px"; // Subtract 1px for the border, 4px for the padding.
		highlightBackground.style.top = bounds.top - 5 + "px";
		highlightBackground.appendChild(highlight);
		document.body.appendChild(highlightBackground);
		setTimeout(function(){document.body.removeChild(document.getElementById('CSSFragHighlightBackground'));}, 1600);
		
		element.focus();
	}
	else { window.scrollTo(bounds.left, bounds.top); }
}


// CSSFrag

function handleContextMenu(event) {
	//
	// Sets display to true only if the event target is something discrete.
	//
	
	var display = true;
	var nodeName = event.target.nodeName.toLowerCase();
	var nodeID = event.target.getAttribute('id');
	
	var eventTargets = document.getElementsByClassName("CSSFragTarget"); // Safari doesn't allow passing elements through setContextMenuEventUserInfo, so we're doing it through the DOM.
	if (eventTargets.length > 0) {
		for (var i=0; i<=eventTargets.length; i++) {
			eventTargets[i].className = eventTargets[i].className.replace(/ CSSFragTarget/g, "");
		}
	}

	event.target.className += " CSSFragTarget";	
	safari.self.tab.setContextMenuEventUserInfo(event, { 'display': (nodeName !== 'body' && nodeName !== 'head' && nodeName !== 'html' && nodeName !== '#document' && nodeID !== 'CSSFragLinkWrapper' && nodeID !== 'CSSFragLinkContainer' && nodeID !== 'CSSFragLinkInput') });
} document.addEventListener('contextmenu', handleContextMenu, false);

function handleMessage(event) {
	//
	// Generates fragment links before sending them to showURLinWindow().
	//
	
	if (event.name === 'generateFragmentLink') {
		window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
		var eventTarget = document.getElementsByClassName("CSSFragTarget")[0];
		eventTarget.className = eventTarget.className.replace(/ CSSFragTarget/g, "");
		
		var href = window.location.href.split("#")[0];
		var currentNode = eventTarget;
		var currentNodeAttribute = currentNode.getAttribute('id');
		var oldSelector = "";
		
		if (singleElementWithSelector(currentNodeAttribute)) { // If this element has a unique ID, we're done here.
			if (settings.preferStandardHashes) { URL = href + "#" + currentNodeAttribute; }
			else { URL = href + "#css(%23" + currentNodeAttribute + ")"; }
		}
		else {
			do {
				var nodeName = currentNode.nodeName.toLowerCase()
				if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html' || nodeName === '#document') { break; }
				var currentNodeAttribute = "";
				
				var selector = { // Ordered by their position in the CSS selector.
					'name': nodeName,
					'href': "",
					'src': "",
					'title': "",
					'type': "",
					'rel': "",
					'action': "",
					'for': "",
					'value': "",
					'rows': "",
					'id': "",
					'class': "",
					'nthChild': "",
					'oldSelector': ">" + oldSelector,
				}
				
				var attributes = [ // Ordered by uniqueness. We could do a uniqueness check on the nodeName itself, but that seems *extremely* volatile.
					'href',
					'src',
					'title',
					'type',
					'name',
					'for',
					'value',
					'action',
					'rows',
					'rel',
				]
				
				// ID
				currentNodeAttribute = currentNode.getAttribute('id');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.id = "#" + currentNodeAttribute; // We could fold this into the for loop and do [id='foobar'] instead, but that's...uglier.
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// Class
				currentNodeAttribute = currentNode.getAttribute('class');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.class = "." + currentNodeAttribute.replace(/ /g, ".");
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// All other attributes
				for (var i in attributes) {
					currentNodeAttribute = currentNode.getAttribute(attributes[i]);
					if (currentNodeAttribute !== null) {
						selector[attributes[i]] = "[" + attributes[i] + "='" + currentNodeAttribute.replace(/('")/g, "\\$1") + "']";
						if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
					}
				}
				
				if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				
				// :nth-child (We don't break on uniqueness here, because :nth-child is really volatile, and a last resort.)
				var currentNodePosition = nthIndex(currentNode);
				if (currentNodePosition > 1) { // To my knowledge, we can't fold this into the for loop as we're running a different check.
					selector.nthChild = ":nth-child(" + currentNodePosition + ")";
				}
				
				oldSelector = dictionaryToSelector(selector);
			} while (currentNode = currentNode.parentNode);
			
			URL = href + "#css(" + encodeURIComponent(dictionaryToSelector(selector)) + ")"
		}
		
		showURLinWindow();
	}
} safari.self.addEventListener('message', handleMessage, false);


function handleAnimationFinished(event) {
	//
	// Called by the animation check functions, hands off to handleLoadAndHashChange() when there is a lull in element animation.
	//
	
	handleLoadAndHashChange(event, true);
} window.addEventListener('animationFinished', handleAnimationFinished, false);

function handleLoadAndHashChange(event, isSafe) {
	window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
	var CSSFragHash = decodeURIComponent(window.location.hash).match(/css\((.+)\)/);
	if (CSSFragHash) { scrollFocusAndHighlight(CSSFragHash[1], true, isSafe); }
	else if (settings.highlightTarget === 'all' && window.location.hash !== '') { scrollFocusAndHighlight(window.location.hash, false, isSafe); }
} window.addEventListener('load', handleLoadAndHashChange, false); window.addEventListener('hashchange', handleLoadAndHashChange, false);

function showURLinWindow() {
	if (document.querySelector("link[href='" + safari.extension.baseURI + "style.css']") === null) {
		var newStyles = document.createElement('link');
		newStyles.rel = 'stylesheet';
		newStyles.type = 'test/css';
		newStyles.href = safari.extension.baseURI + 'style.css';
		document.body.appendChild(newStyles);
	}
	
	if (document.getElementById('CSSFragLinkWrapper') === null) {
		linkWrapper = document.createElement('div');
		linkWrapper.id = "CSSFragLinkWrapper";
		linkWrapper.addEventListener('click', hideURLinWindow, false);
		linkWrapper.innerHTML = '<div id="CSSFragLinkContainer"><div id="CSSFragLinkPadding"><input id="CSSFragLinkInput" name="CSSFragLinkInput" value="" autofocus></div></div></div>'
		document.body.appendChild(linkWrapper);
		
		document.getElementById('CSSFragLinkInput').addEventListener('keyup', function(event){ event.target.value = URL; event.target.select(); }, false);
		document.addEventListener('copy', hideURLinWindow, false);
		document.addEventListener('cut', hideURLinWindow, false);
	}
	
	document.getElementById('CSSFragLinkInput').value = URL;
	
	document.getElementById('CSSFragLinkWrapper').style.display = "block";
	document.getElementById('CSSFragLinkWrapper').className = "";
	setTimeout(function(){document.getElementById('CSSFragLinkWrapper').className = "active";}, 0);
	document.getElementById('CSSFragLinkInput').select();
}

function hideURLinWindow(event) {
	//
	// Hides the URL overlay when the user cuts or copies the link, or clicks outside of the main overlay.
	//
	
	if (event.type === 'copy' || event.type === 'cut' || event.target.getAttribute('id') === 'CSSFragLinkWrapper') {
		document.getElementById('CSSFragLinkWrapper').className = "";
		setTimeout(function(){
			document.getElementById('CSSFragLinkWrapper').style.display = "none";
			document.getElementById('CSSFragLinkWrapper').className = "hidden";
		}, 600);
	}
}
