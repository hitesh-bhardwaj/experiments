import ScrollRigExpClient from "./ScrollRigExpClient";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ScrollRigExpClient />;
}
