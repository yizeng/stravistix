/**
 *   AthleteStatsModifier is responsible of ...
 */
function AthleteStatsModifier() {
    this.cacheKey_ = 'activitiesHistoryData';
}

/**
 * Define prototype
 */
AthleteStatsModifier.prototype = {

    modify: function modify() {

        var self = this,
            total = 0,
            i,
            max,
            url = '/athlete/training_activities?new_activity_only=false&per_page=20&page=',
            activities = [],
            requests = [],
            activitiesFromCache = localStorage.getItem(this.cacheKey_),
            activitiesFromCacheObject = JSON.parse(activitiesFromCache) || [],
            progress = $("#progress-goals"),
            progressThisYear = $("<div class='section'><h3>My year progressions to current month/day <span id='athleteStatsLoading' class='ajax-loading-image'></span></h3><div>This panel allows you to see your progress for each beginning of year to current month and day. Assuming May 25 is today, this panel replies to \"What i've accomplished on May 25 of this year compared to the previous years on same period?\"<br/><br/></div><div><ul class='switches'><li><a class='button btn-xs' data-activity-type='0' style='display: none;'>Cycling</a></li><li class='last-child'><a class='button btn-xs' data-activity-type='1' style='display: none;'>Running</a></li><li>&nbsp;&nbsp;&nbsp;<a href='#' id='athleteStatsLoadingForceRefresh' style='display: none'>Force refresh</a></li></ul></div></div>");

        var formatData = function(activities) {
            var formattedData = [],
                i,
                max,
                activity,
                date;
            for (i = 0, max = activities.length; i < max; i++) {
                activity = activities[i];
                if (activity.type === "Ride" || activity.type === "Run") {
                    date = new Date(activity.start_time);
                    formattedData.push({
                        t: activity.type === "Ride" ? 0 : 1,
                        y: date.getFullYear(),
                        m: date.getMonth(),
                        d: date.getDate(),
                        di: activity.distance_raw,
                        el: activity.elevation_gain_raw,
                        ti: activity.moving_time_raw
                    });
                }
            }
            return formattedData;
        };

        var processData = function(activities) {
            var types = [],
                years,
                i,
                max,
                activity,
                currentDate = new Date(),
                currentYear = currentDate.getFullYear(),
                currentMonth = currentDate.getMonth(),
                currentDay = currentDate.getDate();
            for (i = 0, max = activities.length; i < max; i++) {
                activity = activities[i];
                if (!types[activity.t]) {
                    types[activity.t] = [];
                }
                years = types[activity.t];
                if (!years[activity.y]) {
                    years[activity.y] = {
                        year: activity.y,
                        distance: 0,
                        elevation: 0,
                        time: 0,
                        count: 0
                    };
                }
                if ((activity.m < currentMonth) || (activity.m == currentMonth && activity.d <= currentDay)) {
                    years[activity.y].distance += activity.di;
                    years[activity.y].elevation += activity.el;
                    years[activity.y].time += activity.ti;
                    years[activity.y].count += 1;
                }
            }

            if (types.length === 0) {
                progressThisYear.remove();
                return;
            }

            for (i in types) {
                years = types[i];
                var $table = $("<table class='athletesStatTable' id='athletesStatActivityType" + i + "' style='display: none;'><thead><tr><th>Year</th><th>Distance</th><th>Elevation</th><th>Time</th></tr></thead><tbody></tbody></table>");

                years.sort(function(left, right) {
                    return left.year < right.year;
                }).forEach(function(item) {
                    item.distance /= 1000;

                    $table.find("tbody").append($(
                        "<tr class='" + (item.year === currentYear ? 'currentyear' : '') + "'>" +
                        "<td>" + item.year + "</td>" +
                        // "<td><strong>" + item.year + "</strong>/" + ('0' + currentMonth).slice(-2) + "/" + ('0' + currentDay).slice(-2) + "</td>" +
                        "<td><div>" + Helper.formatNumber(item.distance, 0) + " km</div><div><small>" + Helper.formatNumber(item.count, 0) + " " + (i == 0 ? "Rides" : "Runs") + "</small></div></td>" +
                        "<td>" + Helper.formatNumber(item.elevation, 0) + " m</td>" +
                        "<td>" + Helper.secondsToDHM(item.time) + "</td></tr>"
                    ));
                });
                progressThisYear.append($table);
                progressThisYear.find("a[data-activity-type=" + i + "]").show();
            }

            progressThisYear.find(".switches .button:visible").first().click();
        };

        var init = function(activities) {
            processData(activities);
            progressThisYear.find("#athleteStatsLoading").remove();
            progressThisYear.find("#athleteStatsLoadingForceRefresh").show().click(function(e) {
                e.preventDefault();
                self.handleProgressStatsForceRefresh_();
            });
        };

        $("#ytd_year_bike, #ytd_year_run").ready(function() {

            $(progressThisYear).on("click", "a[data-activity-type]", function(e) {
                e.preventDefault();
                var $this = $(this),
                    type = $this.data("activity-type");
                progressThisYear.find(".athletesStatTable").hide();
                progressThisYear.find("#athletesStatActivityType" + type).show();
                progressThisYear.find("a.button").removeClass("selected");
                $this.addClass("selected");
            });

            progressThisYear.insertAfter(progress);

            total = parseInt($("div.cycling table td:contains('Rides'):last").next().text() || "0");
            total = total + parseInt($("div.running table td:contains('Runs'):last").next().text() || "0");

            if (total != activitiesFromCacheObject.length) {
                for (i = 1, max = Math.ceil(total / 20); i <= max; i++) {
                    requests.push($.ajax(url + i));
                }
                $.when.apply(self, requests).done(function() {
                    for (i in requests) {
                        var request = requests[i];
                        if (request.responseJSON.models) {
                            activities = activities.concat(request.responseJSON.models);
                        }
                    }
                    activities = formatData(activities);
                    init(activities);
                    localStorage.setItem(self.cacheKey_, JSON.stringify(activities));
                });
            } else {
                init(activitiesFromCacheObject);
            }

        }.bind(this));
    },

    handleProgressStatsForceRefresh_: function handleProgressStatsForceRefresh_() {
        localStorage.removeItem(this.cacheKey_);
        window.location.reload();
    }
};
