// Vue Instance for the StudyZone Cart Page (BUG-FREE VERSION)
new Vue({
  el: "#app",
  data: {
    serverUrl: "http://localhost:3000/api",
    cart: [],
    checkout: {
      name: "",
      phone: "",
    },
    submitting: false,
    error: null,
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
    /**
     * Loads the cart data from localStorage when the page is initialized.
     */
    loadCart() {
      this.cart = JSON.parse(localStorage.getItem("studyzone-cart") || "[]");
    },
    /**
     * Removes an item from the cart and updates localStorage.
     */
    removeFromCart(cartIndex) {
      this.cart.splice(cartIndex, 1);
      localStorage.setItem("studyzone-cart", JSON.stringify(this.cart));
    },
    /**
     * The core function to submit the order and update inventory.
     * This contains the main bug fix.
     */
    async submitOrder() {
      if (!this.isCheckoutFormValid || this.submitting) return;

      this.submitting = true;
      this.error = null;

      // 1. Prepare the order payload for the POST request
      const orderPayload = {
        name: this.checkout.name,
        phone: this.checkout.phone,
        items: this.cart.map((item) => ({
          lessonId: item.lessonId,
          spaces: item.spaces,
          name: item.lessonSnapshot.name, // Add name for better logging on backend
        })),
      };

      try {
        // 2. Post the new order to the orders collection
        const orderResponse = await fetch(`${this.serverUrl}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        if (!orderResponse.ok)
          throw new Error("Failed to submit order. Please try again.");

        // 3. **THE FIX**: Create and execute PUT requests to update lesson spaces.
        const updatePromises = this.cart.map((item) => {
          // Calculate the new number of available spaces.
          const newAvailableSpaces =
            item.lessonSnapshot.availableSpaces - item.spaces;

          // This is the payload your backend PUT route expects.
          const updatePayload = {
            availableSpaces: newAvailableSpaces,
          };

          // Send the PUT request to the correct endpoint.
          return fetch(`${this.serverUrl}/lessons/${item.lessonId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
        });

        // Wait for all inventory updates to complete
        const updateResults = await Promise.all(updatePromises);

        // Check if any of the updates failed
        for (const result of updateResults) {
          if (!result.ok) throw new Error("Failed to update lesson inventory.");
        }

        // 4. Redirect to the main page with a success query parameter.
        // The main page will handle clearing localStorage and showing the message.
        window.location.href = `index.html?order=success`;
      } catch (error) {
        this.error = `Error: ${error.message}`;
        console.error("Order submission error:", error);
        this.submitting = false; // Allow the user to try again
      }
    },
  },

  /**
   * When the page is created, load the cart from localStorage.
   */
  created() {
    this.loadCart();
  },
});
