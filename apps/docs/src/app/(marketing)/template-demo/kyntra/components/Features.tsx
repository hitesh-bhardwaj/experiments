// Built using Hyperiux Vault: https://vault.hyperiux.com
import ScrollStack, { type ScrollStackCard } from "./effects/scroll-stack";

import { ParaAnim } from "./Animations/gsapAnim";

import card1Property from "../assets/features/card1/property.svg";
import card1Home from "../assets/features/card1/home.svg";
import card1Energy from "../assets/features/card1/energy.svg";
import card1System from "../assets/features/card1/system.svg";

import card2PersonalAssistance from "../assets/features/card2/personnel-ass.svg";
import card2ServiceSchedule from "../assets/features/card2/service-schedule.svg";
import card2Service from "../assets/features/card2/service.svg";
import card2Priority from "../assets/features/card2/priority.svg";

import card3Experts from "../assets/features/card3/experts.svg";
import card3Professionals from "../assets/features/card3/professionals.svg";
import card3Safety from "../assets/features/card3/safety.svg";
import card3ServiceHistory from "../assets/features/card3/service-history.svg";

import card4Payments from "../assets/features/card4/payments.svg";
import card4Invoice from "../assets/features/card4/invoice.svg";
import card4Spending from "../assets/features/card4/spending.svg";
import card4Payment from "../assets/features/card4/payment.svg";

import card5SmartHome from "../assets/features/card5/smart-home.svg";
import card5DeviceInt from "../assets/features/card5/device-int.svg";
import card5Cloud from "../assets/features/card5/cloud.svg";
import card5DevApi from "../assets/features/card5/dev-api.svg";

const cards: ScrollStackCard[] = [
  {
    id: 1,
    title: "Home Intelligence",
    description:
      "Get a clear picture of your home, from its key systems and spaces to the things that matter most.",
    items: [
      { label: "Property Profile", icon: card1Property },
      { label: "Home Insights", icon: card1Home },
      { label: "Energy Overview", icon: card1Energy },
      { label: "System Overview", icon: card1System },
    ],
    buttonText: "Discover More",
    buttonHref: "#",
  },
  {
    id: 2,
    title: "Kyntra Concierge",
    description:
      "From finding the right professional to coordinating your next visit, Kyntra Concierge helps take the work off your hands.",
    items: [
      { label: "Personal Assistance", icon: card2PersonalAssistance },
      { label: "Service Scheduling", icon: card2ServiceSchedule },
      { label: "Service Coordination", icon: card2Service },
      { label: "Priority Support", icon: card2Priority },
    ],
    buttonText: "Discover More",
    buttonHref: "#",
  },
  {
    id: 3,
    title: "Trusted Professionals",
    description:
      "Know who is coming to your home with verified professionals, transparent profiles, and service records.",
    items: [
      { label: "Verified Experts", icon: card3Experts },
      { label: "Rated Professionals", icon: card3Professionals },
      { label: "Safety Checked", icon: card3Safety },
      { label: "Service History", icon: card3ServiceHistory },
    ],
    buttonText: "Discover More",
    buttonHref: "#",
  },
  {
    id: 4,
    title: "Home Wallet",
    description:
      "Track what you spend on your home and keep every payment and invoice easy to find.",
    items: [
      { label: "Easy Payments", icon: card4Payments },
      { label: "Digital Invoices", icon: card4Invoice },
      { label: "Service Spending", icon: card4Spending },
      { label: "Payment History", icon: card4Payment },
    ],
    buttonText: "Discover More",
    buttonHref: "#",
  },
  {
    id: 5,
    title: "API & Integration",
    description:
      "Get a clear picture of your home, from its key systems and spaces to the things that matter most.",
    items: [
      { label: "Smart Home Connect", icon: card5SmartHome },
      { label: "Device Integration", icon: card5DeviceInt },
      { label: "Cloud Services", icon: card5Cloud },
      { label: "Developer API", icon: card5DevApi },
    ],
    buttonText: "Discover More",
    buttonHref: "#",
  },
];

const Features = () => {
  return (
    <section id="features" className="kyntra-container w-full bg-white text-black">
      <div className="mx-auto pb-0 max-w-400">
        <div className="max-w-[46vw] max-[1025px]:max-w-full">
          <ParaAnim
            as="h2"
            className="font-helvetica-neue leading-[1.12] font-normal tracking-[-0.02em] "
          >
            Your Dedicated Operating Layer for the Home
          </ParaAnim>
          <ParaAnim
            as="p"
            className="text-24 max-[1025px]:pb-[7vh] mt-[1.6vw] max-[1025px]:mt-[6vw] max-w-[30vw] tracking-wide leading-normal text-black max-[1025px]:max-w-full "
          >
            The more Kyntra understands your property, the easier it becomes to manage everything around it.
          </ParaAnim>
        </div>
      </div>

      <ScrollStack
        cards={cards}
        sectionBgColor="#ffffff"
        cardRadius={28}
      />
    </section>
  );
};

export default Features;
