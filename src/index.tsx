import React, { useEffect, useRef, useState } from "react";

export interface Translation {
  x: number;
  y: number;
}

export type ControlMethod = "mouse" | "trackpad";

export interface PanZoomMapProps extends React.HTMLAttributes<HTMLDivElement> {
  controlMethod?: ControlMethod;

  defaultTranslation?: Translation;
  defaultZoom?: number;

  isPanEnabled?: boolean;
  isZoomEnabled?: boolean;

  panSensitivity?: number;
  zoomSensitivity?: number;

  minZoom?: number;
  maxZoom?: number;

  onPanZoom?: (translation: Translation, scale: number) => void;
}

const PanZoomMap: React.FC<PanZoomMapProps> = ({
  controlMethod = "mouse",

  defaultTranslation = { x: 0, y: 0 },
  defaultZoom = 1,

  isPanEnabled = true,
  isZoomEnabled = true,

  panSensitivity = 1,
  zoomSensitivity = 1,

  minZoom = 0.1,
  maxZoom = 10,

  onPanZoom,

  children,

  ...props
}) => {
  const map = useRef<HTMLDivElement>(null);

  const translation = useRef<Translation>(defaultTranslation);
  const zoom = useRef<number>(defaultZoom);

  const startGrabMousePosition = useRef<Translation | null | undefined>();
  const startGrabTranslation = useRef<Translation | null | undefined>();

  const [transform, setTransform] = useState<string>(
    `translate(${defaultTranslation.x}px, ${defaultTranslation.y}px) scale(${defaultZoom})`
  );

  useEffect(() => {
    if (map.current == null) {
      return;
    }

    const mapElement = map.current;

    const updateTransform = () => {
      setTransform(
        `translate(${translation.current.x}px, ${translation.current.y}px) scale(${zoom.current})`
      );
      onPanZoom && onPanZoom(translation.current, zoom.current);
    };

    const handleZoom = (e: WheelEvent): [Translation, number] => {
      const xScale =
        (e.clientX -
          mapElement.getBoundingClientRect().x -
          translation.current.x) /
        zoom.current;
      const yScale =
        (e.clientY -
          mapElement.getBoundingClientRect().y -
          translation.current.y) /
        zoom.current;

      const adjSensitivity =
        controlMethod === "mouse" ? zoomSensitivity / 4 : zoomSensitivity;
      let newZoom =
        zoom.current - zoom.current * e.deltaY * 0.01 * adjSensitivity;

      if (minZoom != null) {
        newZoom = Math.max(minZoom, newZoom);
      }
      if (maxZoom != null) {
        newZoom = Math.min(maxZoom, newZoom);
      }

      const newTranslation = {
        x: e.clientX - mapElement.getBoundingClientRect().x - xScale * newZoom,
        y: e.clientY - mapElement.getBoundingClientRect().y - yScale * newZoom,
      };

      return [newTranslation, newZoom];
    };

    const handleWheelEvent = (e: WheelEvent) => {
      switch (controlMethod) {
        case "mouse":
          e.preventDefault();

          if (!e.ctrlKey) {
            [translation.current, zoom.current] = handleZoom(e);
            updateTransform();
          }

          break;

        case "trackpad":
          e.preventDefault();

          if (!e.ctrlKey && isPanEnabled) {
            const deltaX =
              e.deltaX > 0 ? Math.min(e.deltaX, 75) : Math.max(e.deltaX, -75);
            const deltaY =
              e.deltaY > 0 ? Math.min(e.deltaY, 75) : Math.max(e.deltaY, -75);

            translation.current = {
              x: translation.current.x - deltaX * panSensitivity,
              y: translation.current.y - deltaY * panSensitivity,
            };
          } else if (e.ctrlKey && isZoomEnabled) {
            [translation.current, zoom.current] = handleZoom(e);
          }

          updateTransform();

          break;
      }
    };

    const handleMousedownEvent = (e: MouseEvent) => {
      if (controlMethod === "mouse") {
        startGrabMousePosition.current = {
          x: e.clientX,
          y: e.clientY,
        };
        startGrabTranslation.current = translation.current;
      }
    };

    const handleMousemoveEvent = (e: MouseEvent) => {
      if (startGrabTranslation.current && startGrabMousePosition.current) {
        translation.current = {
          x:
            startGrabTranslation.current.x +
            e.clientX -
            startGrabMousePosition.current.x,
          y:
            startGrabTranslation.current.y +
            e.clientY -
            startGrabMousePosition.current.y,
        };

        updateTransform();
      }
    };

    const handleMouseupEvent = () => {
      startGrabMousePosition.current = null;
    };

    switch (controlMethod) {
      case "mouse":
        if (isPanEnabled) {
          mapElement.addEventListener("mousedown", handleMousedownEvent);
          mapElement.addEventListener("mousemove", handleMousemoveEvent);
          mapElement.addEventListener("mouseup", handleMouseupEvent);
        }
        if (isZoomEnabled) {
          mapElement.addEventListener("wheel", handleWheelEvent);
        }

        break;
      case "trackpad":
        if (isPanEnabled || isZoomEnabled) {
          mapElement.addEventListener("wheel", handleWheelEvent);
        }
        break;
    }

    return () => {
      mapElement.removeEventListener("wheel", handleWheelEvent);
      mapElement.removeEventListener("mousedown", handleMousedownEvent);
      mapElement.removeEventListener("mousemove", handleMousemoveEvent);
      mapElement.removeEventListener("mouseup", handleMouseupEvent);
    };
  }, [
    controlMethod,
    isPanEnabled,
    isZoomEnabled,
    panSensitivity,
    zoomSensitivity,
    minZoom,
    maxZoom,
    onPanZoom,
  ]);

  return (
    <div style={{ height: "100%", overflow: "hidden" }} ref={map} {...props}>
      <div style={{ transformOrigin: "0px 0px", transform }}>{children}</div>
    </div>
  );
};

export default PanZoomMap;
