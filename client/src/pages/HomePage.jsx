import LeCode from "@/assets/LOGO LANDING.svg";
import FormComponent from "@/components/forms/FormComponent";
// import Footer from "@/components/common/Footer";

function HomePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-16 bg-black">
            <div className="my-12 flex h-full min-w-full flex-col-reverse items-center justify-evenly sm:flex-row sm:pt-0">
                <div className="flex w-full items-center justify-center sm:w-1/2">
                    <FormComponent />
                </div>
                <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4">
                    <img
                        src={LeCode}
                        alt="LeCode"
                        className="mx-auto w-[600px] sm:w-[800px]"
                    />
                </div>
            </div>
            {/* <Footer /> */}
        </div>
    )
}

export default HomePage;
