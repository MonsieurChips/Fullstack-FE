
new Vue({
    el: '#app',
    data: {

        baseUrl: "https://studyzone-k553.onrender.com",
        serverUrl: "https://studyzone-k553.onrender.com/api",
        lesson: null,
        cart: [],
        loading: true,
        error: null,
    },
    computed: {
        cartItemCount() {
            return this.cart.reduce((total, item) => total + item.spaces, 0);
        },
        displaySpaces() {
            if (!this.lesson) return 0;
            const itemInCart = this.cart.find(item => item.lessonId === this.lesson._id);
            const spacesInCart = itemInCart ? itemInCart.spaces : 0;
            return this.lesson.availableSpaces - spacesInCart;
        },
        canAddToCart() {
            return this.displaySpaces > 0;
        }
    },
    methods: {
        fetchLesson() {
            const urlParams = new URLSearchParams(window.location.search);
            const lessonId = urlParams.get('id');

            if (!lessonId) {
                this.error = "No lesson ID provided.";
                this.loading = false;
                return;
            }

            this.loading = true;
            fetch(`${this.serverUrl}/lessons/${lessonId}`)
                .then(response => {
                    if (!response.ok) throw new Error("Lesson not found.");
                    return response.json();
                })
                .then(data => {
                    this.lesson = {
                        ...data,
                        image: `${this.baseUrl}${data.image}`
                    };
                    document.title = `StudyZone - ${this.lesson.name}`;
                })
                .catch(err => {
                    this.error = err.message;
                    console.error(err);
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        addToCart(lesson) {
            if (!this.canAddToCart) return;

            const cartItem = this.cart.find(item => item.lessonId === lesson._id);
            if (cartItem) {
                cartItem.spaces++;
            } else {
                this.cart.push({
                    lessonId: lesson._id,
                    spaces: 1,
                    lessonSnapshot: { ...lesson }
                });
            }
            this.saveCart();
        },
        saveCart() {
            localStorage.setItem('studyzone-cart', JSON.stringify(this.cart));
        }
    },
    created() {
        this.cart = JSON.parse(localStorage.getItem('studyzone-cart') || '[]');
        this.fetchLesson();
    }
});
