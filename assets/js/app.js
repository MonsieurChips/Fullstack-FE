// Main Vue Instance for the StudyZone Lessons Page (IMAGE VERSION)
new Vue({
  el: "#app",
  data: {
    // NOTE: The base URL for static files does not include '/api'
    baseUrl: "http://localhost:3000",
    serverUrl: "http://localhost:3000/api",
    lessons: [],
    cart: [],
    loading: true,
    error: null,
    orderSuccess: false,
    searchQuery: "",
    searchDebounce: null,
    sort: {
      attribute: "name",
      order: "asc",
    },
  },

  computed: {
    cartItemCount() {
      return this.cart.reduce((total, item) => total + item.spaces, 0);
    },
    sortedLessons() {
      return [...this.lessons].sort((a, b) => {
        let valA = a[this.sort.attribute];
        let valB = b[this.sort.attribute];
        if (typeof valA === "string") {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        if (valA < valB) return this.sort.order === "asc" ? -1 : 1;
        if (valA > valB) return this.sort.order === "asc" ? 1 : -1;
        return 0;
      });
    },
  },

  methods: {
    fetchLessons() {
      this.loading = true;
      this.error = null;
      fetch(`${this.serverUrl}/lessons/`)
        .then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then((data) => this.processAndDisplayLessons(data))
        .catch(this.handleFetchError)
        .finally(() => {
          this.loading = false;
        });
    },
    handleSearch() {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => {
        const query = this.searchQuery.trim();
        let fetchUrl = `${this.serverUrl}/lessons/`;
        if (query) {
          fetchUrl = `${
            this.serverUrl
          }/lessons/search?query=${encodeURIComponent(query)}`;
        }
        this.loading = true;
        this.error = null;
        fetch(fetchUrl)
          .then((response) => {
            if (!response.ok)
              throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
          })
          .then((data) => this.processAndDisplayLessons(data))
          .catch(this.handleFetchError)
          .finally(() => {
            this.loading = false;
          });
      }, 500);
    },
    processAndDisplayLessons(serverLessons) {
      const cartItemMap = this.cart.reduce((map, item) => {
        map[item.lessonId] = item.spaces;
        return map;
      }, {});

      this.lessons = serverLessons.map((lesson) => {
        const spacesInCart = cartItemMap[lesson._id] || 0;
        return {
          ...lesson,
          // **THE CHANGE**: Construct the full image URL
          image: `${this.baseUrl}${lesson.image}`,
          displaySpaces: lesson.availableSpaces - spacesInCart,
        };
      });
    },
    handleFetchError(error) {
      this.error =
        "Failed to fetch data from the server. Please ensure the backend is running and the URL is correct.";
      console.error("Fetch error:", error);
      this.lessons = [];
    },
    canAddToCart(lesson) {
      return lesson.displaySpaces > 0;
    },
    addToCart(lesson) {
      if (!this.canAddToCart(lesson)) return;

      lesson.displaySpaces--;

      const cartItem = this.cart.find((item) => item.lessonId === lesson._id);
      if (cartItem) {
        cartItem.spaces++;
      } else {
        this.cart.push({
          lessonId: lesson._id,
          spaces: 1,
          // **THE CHANGE**: The lesson snapshot now contains the full image URL
          lessonSnapshot: { ...lesson },
        });
      }
      this.saveCart();
    },
    saveCart() {
      localStorage.setItem("studyzone-cart", JSON.stringify(this.cart));
    },
    checkForSuccessMessage() {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("order") === "success") {
        this.orderSuccess = true;
        localStorage.removeItem("studyzone-cart");
        this.cart = [];
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    },
  },

  created() {
    this.cart = JSON.parse(localStorage.getItem("studyzone-cart") || "[]");
    this.checkForSuccessMessage();
    this.fetchLessons();
  },
});
