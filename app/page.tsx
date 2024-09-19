import DrawingCanvas from "@/components/DrawingCanvas";
import React, { Suspense } from "react";
import { Spinner } from "flowbite-react";

export default function Home() {
  return (
      <div className="App">
          <Suspense fallback={
              <div className="absolute flex justify-center items-center w-dvw h-dvh">
                  <Spinner aria-label="Loading..." size="xl"/>
              </div>
          }>
              <DrawingCanvas/>
          </Suspense>
      </div>
  );
}
