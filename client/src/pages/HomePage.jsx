import LeCode from "@/assets/LOGO LANDING.svg";
import FormComponent from "@/components/forms/FormComponent";
// import Footer from "@/components/common/Footer";

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-15" style={{ backgroundColor: 'black' }}>
      <div className="my-10 flex h-full min-w-full flex-col items-center justify-evenly sm:flex-row sm:pt-0">
        <div className="flex w-full items-center justify-center sm:w-1/3 pl-40">
          <FormComponent className="w-full max-w-md" />
        </div>
        <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-15 pl-20">
          <img
            src={LeCode}
            alt="LeCode"
            className="mx-auto w-[700px] sm:w-[900px]"
          />
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}

export default HomePage;
