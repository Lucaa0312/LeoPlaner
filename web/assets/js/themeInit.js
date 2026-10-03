// Sets the saved design (light/dark) before the page is drawn, so a dark page never flashes light.
// Plain script on purpose: modules run after parsing, which is too late for this.
(function () {
    var theme = "light";

    try {
        var saved = localStorage.getItem("leoplaner-theme");
        if (saved === "dark") {
            theme = "dark";
        }
    } catch (error) {
        // storage blocked: stay light
    }

    document.documentElement.dataset.theme = theme;
})();
