// Vue Instance for the StudyZone Cart Page (with Thank You Message)
new Vue({
  el: "#app",
  data: {
    serverUrl: "https://studyzone-k553.onrender.com/api",
    cart: [],
    checkout: {
      name: "",
      phone: "",
    },
    submitting: false,
    error: null,

    orderPlaced: false,
  },

  computed: {
    isCartEmpty() {
      return this.cart.length === 0;
    },
    cartTotal() {
      if (this.isCartEmpty) return 0;
      return this.cart.reduce(
        (total, item) => total + item.lessonSnapshot.price * item.spaces,
        0
      );
    },
    isNameValid() {
      return /^[A-Za-z\s]+$/.test(this.checkout.name);
    },
    isPhoneValid() {
      return /^[0-9]+$/.test(this.checkout.phone);
    },
    isCheckoutFormValid() {
      return (
        this.checkout.name &&
        this.isNameValid &&
        this.checkout.phone &&
        this.isPhoneValid &&
        !this.isCartEmpty
      );
    },
  },

  methods: {
    loadCart() {
      this.cart = JSON.parse(localStorage.getItem("studyzone-cart") || "[]");
    },
    removeFromCart(cartIndex) {
      this.cart.splice(cartIndex, 1);
      localStorage.setItem("studyzone-cart", JSON.stringify(this.cart));
    },
    async submitOrder() {
      if (!this.isCheckoutFormValid || this.submitting) return;

      this.submitting = true;
      this.error = null;

      const orderPayload = {
        name: this.checkout.name,
        phone: this.checkout.phone,
        items: this.cart.map((item) => ({
          lessonId: item.lessonId,
          spaces: item.spaces,
          name: item.lessonSnapshot.name,
        })),
      };

      try {
        const orderResponse = await fetch(`${this.serverUrl}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        if (!orderResponse.ok)
          throw new Error("Failed to submit order. Please try again.");

        const lessonsToUpdate = this.cart.map((item) => {
          const newAvailableSpaces =
            item.lessonSnapshot.availableSpaces - item.spaces;
          const updatePayload = { availableSpaces: newAvailableSpaces };
          return fetch(`${this.serverUrl}/lessons/${item.lessonId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
        });

        await Promise.all(lessonsToUpdate);


        localStorage.removeItem("studyzone-cart");

        this.orderPlaced = true;
      } catch (error) {
        this.error = `Error: ${error.message}`;
        console.error("Order submission error:", error);
        this.submitting = false;
      }
    },
  },

  created() {
    this.loadCart();
  },
});
