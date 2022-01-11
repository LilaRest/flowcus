class View extends Component {

    constructor (display_name,
                 slug,
                 icon,
                 hotkey,
                 dependencies = [],
                 template_path = null,
                 main_script = null, // Main script are injected at the end of the initialization process, it ensures in iframed views that every required lib is loaded before starting the main() function
                 use_iframe_isolation = true,
                 require_css_reset = true) {

        super(display_name,
              slug,
              icon,
              hotkey,
              dependencies);

        this.template_path = template_path;
        this.main_script = main_script;
        this.use_iframe_isolation = use_iframe_isolation;
        this.require_css_reset = require_css_reset;

        this.body = document.createElement("body")
        this.frame;
    }

    static displayDefaultView () {

        return Settings.get("default-view", function (value) {
            const default_view = View.getById(value)

            // If a default view is defined.
            if (default_view !== null) {
                if (default_view.displayed === true) {
                    default_view.trigger()
                    return;
                }
            }
            // Else
            for (const view of View.getAll()) {
                if (view.displayed === true) {
                    view.trigger()
                }
            }
        })
    }

    init () {

        return new Promise((resolve, reject) => {
            this.waitForDependencies()
            .then(() => this.generateContent())
            .then(() => {
                // Dispatch the ready event.
                this.is_ready = true
                window.dispatchEvent(this.ready_event)
            })
            .then(() => this.displayed ? this.generateIframe() : null)
            .then(() => this.displayed ? this.generateButton() : null)
            .then(() => resolve())
            .then(() => this.displayed ? this.insertContentInFrame() : null)
            .catch(error => {
                error ? console.log("An error occured while trying to initialize this view " + this.id + ". Error : " + error) : null
                reject(error)
            })
        })
    }

    generateIframe () {

        return new Promise((resolve, reject) => {
            try {

                // Create the iframe or section element
                if (this.use_iframe_isolation === true) {
                    this.frame = document.createElement("iframe")
                }
                else {
                    this.frame = document.createElement("section")
                }

                // Add required class and ids
                if (this.require_css_reset === true) {
                    this.body.classList.add("requires-css-reset")
                    this.frame.classList.add("requires-css-reset")
                }
                this.frame.classList.add("view-frame")
                if (this.use_iframe_isolation === false) {
                    this.body.classList.add("view-body")
                }
                this.body.id = this.id


                if (this.use_iframe_isolation === true) {

                    // Add the iframe src
                    this.frame.src = browser.runtime.getURL(this.template_path ? this.template_path : "/2_webpage/components/views/common/staticfiles/templates/view.html")
                }

                document.body.appendChild(this.frame)
                resolve()
            }
            catch (error) {
                reject("An error occured while generating iframe of view " + this.id + ". Error : " + error)
            }
        })
    }

    generateContent () {

        return new Promise((resolve, reject) => {

            try {

                this.body.innerHTML = "This content is generated by the default generateContent() method."

                // Resolve the promise.
                resolve()
            }
            catch (error) {
                reject("An error occured while generating content of view " + this.id + ". Error : " + error)
            }
        })
    }

    insertContentInFrame () {

        return new Promise((resolve, reject) => {

            try {

                // Firstly insert the body's content
                if (this.use_iframe_isolation === true) {
                    const iframe_document = this.frame.contentWindow.document;
                    if (iframe_document.readyState === "complete") {
                        iframe_document.body = this.body;
                    }
                    else {
                        this.frame.addEventListener("load", function () {
                            const loaded_iframe_document = this.frame.contentWindow.document;
                            loaded_iframe_document.body = this.body;
                        }.bind(this))
                    }
                }
                else {
                    this.frame.appendChild(this.body)
                }

                // Finaaly insert the main script file (if there is one).
                if (this.main_script) {
                    const script = document.createElement("script")
                    script.src = browser.runtime.getURL(this.main_script)

                    if (this.use_iframe_isolation === true) {
                        if (this.frame.readyState === "complete") {
                            this.frame.contentWindow.document.head.appendChild(script)
                        }
                        else {
                            this.frame.addEventListener("load", function () {
                                this.frame.contentWindow.document.head.appendChild(script)
                            }.bind(this))
                        }
                    }

                    else {
                        document.head.appendChild(script)
                    }
                }

                resolve()
            }
            catch (error) {
                reject("An error occured while inserting the content of view " + this.id + ". Error : " + error)
            }
        })
    }

    static last_displayed_view = null;
    static transition_ongoing = false;
    _trigger () {

        // Do nothing if this is already the last displayed view or if a transition is in progress
        if (this !== this.constructor.last_displayed_view && this.constructor.transition_ongoing === false) {

            // Set transition_ongoing to true
            this.constructor.transition_ongoing = true

            if (this.constructor.last_displayed_view === null) {

                // Display this view iframe
                this.frame.style.opacity = "0"
                this.frame.style.display = "block";
                setTimeout(function () {
                    this.frame.style.opacity = "1";
                }.bind(this), 40)
                this.constructor.last_displayed_view = this

                // Add the displayed class to this button
                this.button.classList.add("displayed")
            }
            else {

                // Clone the last_view object in case it changes
                const last_view = {...this.constructor.last_displayed_view}

                // Remove the displayed class from the last displayed view's button.
                last_view.button.classList.remove("displayed")

                // Add the displayed class to this button
                this.button.classList.add("displayed")

                // Find the slide direction.
                const views_ids = View.getAll(true)
                let direction;
                if (views_ids.indexOf(this.id) < views_ids.indexOf(this.constructor.last_displayed_view.id)) {
                    direction = "left"
                }
                else {
                    direction = "right"
                }

                // Prepare transition : position the next view at the left of the screen, etc.
                last_view.frame.style.position = "absolute"
                last_view.frame.style.zIndex = "0";
                this.frame.style.marginLeft = direction === "left" ? "-100vw" : "100vw"
                this.frame.style.display = "block";
                this.frame.style.zIndex = "1";

                // Display this view iframe by sliding the next view into the screen and sliding the last view out of the screen
                setTimeout(function () {
                    last_view.frame.style.marginLeft = direction === "left" ? "100vw" : "-100vw"
                    this.frame.style.marginLeft = "0";
                }.bind(this), 40)

                // Reset the previous view if it still a not displayed view
                setTimeout(function () {
                    if (last_view.id !== last_view.id) {
                        last_view.frame.style.display = "none"
                        last_view.frame.style.marginLeft = "0"
                        last_view.frame.style.position = "unset"
                        last_view.frame.style.zIndex = "0";
                    }
                }.bind(this), 290)

                this.constructor.last_displayed_view = this
            }

            // Set transition_ongoing to false
            this.constructor.transition_ongoing = false
        }
    }
}
