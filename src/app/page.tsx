import React from "react";
import Navbar from "@/app/components/Navbar";
import Hero from "@/app/components/Hero";
import Features from "./components/Features";
import Workflow from "./components/Workflow";
import WhyApo from "./components/WhyApo";
import Footer from "./components/Footer";
const page = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      {/* <WhyApo /> */}
      <Footer />
    </div>
  );
};

export default page;
