var module = angular.module('commafeed.directives', []);

/**
 * Open a popup window pointing to the url in the href attribute
 */
module.directive('popup', function() {
	return {
		link : function(scope, elm, attrs) {
			elm.bind('click', function(event) {
				window.open(this.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
				event.preventDefault();
			});
		}
	};
});

/**
 * Reusable favicon component
 */
module.directive('favicon', function() {
	return {
		restrict : 'E',
		scope : {
			url : '='
		},
		replace : true,
		template : '<img ng-src="{{iconUrl()}}" class="favicon" onError="this.src=\'images/default_favicon.gif\'"></img>',
		controller : ['$scope', function($scope) {
			$scope.iconUrl = function() {
				var url = $scope.url;

				var current = window.location.href;
				var baseUrl = current.substring(0, current.lastIndexOf('#'));
				var defaultIcon = baseUrl + 'images/default_favicon.gif';
				if (!url) {
					return defaultIcon;
				}

				var index = Math.max(url.length, url.lastIndexOf('?'));
				var iconUrl = 'http://g.etfv.co/';
				iconUrl += encodeURIComponent(url.substring(0, index));
				iconUrl += '?defaulticon=none';
				return iconUrl;
			};
		}]
	};
});

/**
 * Support for the blur event
 */
module.directive('ngBlur', function() {
	return {
		restrict : 'A',
		link : function(scope, elm, attrs) {
			elm.bind('blur', function() {
				scope.$apply(attrs.ngBlur);
			});
		}
	};
});

/**
 * Fired when the top of the element is not visible anymore
 */
module.directive('onScrollMiddle', function () {
	return {
		restrict : 'A',
		link : function(scope, element, attrs) {
			
			var w = $(window);
			var e = $(element);
			
			var direction = 'down';
			
			var down = function() {
				var docTop = w.scrollTop();
				var docMiddle = docTop + w.height() / 2; 
				var elemTop = e.offset().top;
				return (elemTop > docMiddle) ? 'below' : 'above';
			};
			var up = function() {
				var docTop = w.scrollTop();
				var docMiddle = docTop + w.height() / 2; 
				var elemTop = e.offset().top;
				var elemBottom = elemTop + e.height();
				
				return (elemBottom > docMiddle) ? 'below' : 'above';
			};
			
			if(!w.data.scrollInit){
				$(window).bind('scroll', function(e) {
					var direction = e.detail > 0 ? 'down' : 'up';
					scope.$apply();
				});
				w.data.scrollInit = true;
			}
			scope.$watch(down, function(value, oldValue) {
				if(direction == 'down' && value && oldValue && value != oldValue)
					scope.$eval(attrs.onScrollMiddle);
			});
			scope.$watch(up, function(value, oldValue) {
				if(direction == 'up' && value && oldValue && value != oldValue)
					scope.$eval(attrs.onScrollMiddle);
			});
		}
	};
});

/**
 * Scrolls to the element if the value is true
 */
module.directive('scrollTo', [ '$timeout', function($timeout) {
	return {
		restrict : 'A',
		link : function(scope, element, attrs) {
			scope.$watch(attrs.scrollTo, function(value) {
				if (!value)
					return;
				$timeout(function() {
					var docTop = $(window).scrollTop();
					var docBottom = docTop + $(window).height();

					var elemTop = $(element).offset().top;
					var elemBottom = elemTop + $(element).height();

					if ((elemTop > docTop) && (elemBottom < docBottom)) {
						// element is entirely visible
						return;
					} else {
						var offset = parseInt(attrs.scrollToOffset, 10);
						var scrollTop = $(element).offset().top + offset;
						$('html, body').animate({
							scrollTop : scrollTop
						}, 0);
					}
				});
			});
		}
	};
} ]);

/**
 * Prevent mousewheel scrolling from propagating to the parent when scrollbar reaches top or bottom
 */
module.directive('mousewheelScrolling', function() {
	return {
		restrict : 'A',
		link : function(scope, elem, attr) {
			elem.bind('mousewheel', function(e, d) {
				var t = $(this);
				if (d > 0 && t.scrollTop() === 0) {
					e.preventDefault();
				} else {
					if (d < 0
							&& (t.scrollTop() == t.get(0).scrollHeight
									- t.innerHeight())) {
						e.preventDefault();
					}
				}
			});
		}
	};
});

/**
 * Needed to use recursive directives. Wrap a recursive element with a <recursive> tag
 */
module.directive('recursive', [ '$compile', function($compile) {
	return {
		restrict : 'E',
		priority : 100000,
		compile : function(tElement, tAttr) {
			var contents = tElement.contents().remove();
			var compiledContents;
			return function(scope, iElement, iAttr) {
				if (!compiledContents) {
					compiledContents = $compile(contents);
				}
				iElement.append(compiledContents(scope, function(clone) {
					return clone;
				}));
			};
		}
	};
} ]);

/**
 * Reusable category component
 */
module.directive('category', [ function() {
	return {
		scope : {
			node : '=',
			level: '=',
			selectedType : '=',
			selectedId : '=',
			showLabel : '=',
			showChildren : '=',
			unreadCount : '&'
		},
		restrict : 'E',
		replace : true,
		templateUrl : 'templates/_category.html',
		controller : [
				'$scope',
				'$state',
				'$dialog',
				'FeedService',
				'CategoryService',
				'SettingsService',
				function($scope, $state, $dialog, FeedService, CategoryService,
						SettingsService) {
					$scope.settingsService = SettingsService;
					
					$scope.getClass = function(level) {
						if ($scope.showLabel){
							return 'indent' + level;
						}
					};

					$scope.formatCategoryName = function(category) {
						var count = $scope.unreadCount({
							category : category
						});
						var label = category.name;
						if (count > 0) {
							label = label + ' (' + count + ')';
						}
						return label;
					};

					$scope.formatFeedName = function(feed) {
						var label = feed.name;
						if (feed.unread > 0) {
							label = label + ' (' + feed.unread + ')';
						}
						return label;
					};

					$scope.feedClicked = function(id) {
						if ($scope.selectedType == 'feed'
								&& id == $scope.selectedId) {
							$scope.$emit('emitReload');
						} else {
							$state.transitionTo('feeds.view', {
								_type : 'feed',
								_id : id
							});
						}
					};

					$scope.categoryClicked = function(id) {
						if ($scope.selectedType == 'category'
								&& id == $scope.selectedId) {
							$scope.$emit('emitReload');
						} else {
							$state.transitionTo('feeds.view', {
								_type : 'category',
								_id : id
							});
						}
					};
					
					$scope.showFeedDetails = function(feed) {
						$state.transitionTo('feeds.feed_details', {
							_id: feed.id
						});
					};
					
					$scope.showCategoryDetails = function(category) {
						$state.transitionTo('feeds.category_details', {
							_id: category.id
						});
					};

					$scope.toggleCategory = function(category, event) {
						event.preventDefault();
						event.stopPropagation();
						category.expanded = !category.expanded;
						if (category.id == 'all') {
							return;
						}
						CategoryService.collapse({
							id : category.id,
							collapse : !category.expanded
						});
					};
				} ]
	};
} ]);

/**
 * Reusable spinner component
 */
module.directive('spinner', function() {
	return {
		scope : {
			shown : '='
		},
		restrict : 'A',
		link : function($scope, element) {
			element.addClass('spinner');
			var opts = {
				lines : 11, // The number of lines to draw
				length : 5, // The length of each line
				width : 3, // The line thickness
				radius : 8, // The radius of the inner circle
				corners : 1, // Corner roundness (0..1)
				rotate : 0, // The rotation offset
				color : '#000', // #rgb or #rrggbb
				speed : 1.3, // Rounds per second
				trail : 60, // Afterglow percentage
				shadow : false, // Whether to render a shadow
				hwaccel : true, // Whether to use hardware acceleration
				zIndex : 2e9, // The z-index (defaults to 2000000000)
				top : 'auto', // Top position relative to parent in px
				left : 'auto' // Left position relative to parent in px
			};
			var spinner = new Spinner(opts);
			$scope.$watch('shown', function(shown) {
				if (shown) {
					spinner.spin();
					element.append(spinner.el);
				} else {
					spinner.stop();
				}
			});
		}
	};
});