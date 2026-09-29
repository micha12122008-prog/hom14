import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          fullname: (params.name ?? params.fullname) as string,
          name: (params.name ?? params.fullname) as string,
        };
      },
    }),
    Google({
      profile(params) {
        return {
          id: params.sub,
          email: params.email,
          fullname: params.name,
          name: params.name,
          image: params.picture,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // Дозволяємо повернення у мобільний додаток через deep link (prostirp31://, prostirp31-dev://)
      return redirectTo;
    },
  },
});


