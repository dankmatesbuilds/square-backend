import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

declare global {
    interface Window {
        Square: any
    }
}

type Props = {
    applicationId: string
    locationId: string
    checkoutUrl: string
    amount: number
    buttonText: string
}

export default function SquareCheckout(props: Props) {
    const { applicationId, locationId, checkoutUrl, amount, buttonText } = props
    const cardContainerRef = React.useRef<HTMLDivElement>(null)
    const [card, setCard] = React.useState<any>(null)
    const [status, setStatus] = React.useState("")

    React.useEffect(() => {
        if (card) return

        const scriptId = "square-web-payments-sdk"

        const initialize = async () => {
            if (!window.Square || !cardContainerRef.current) return

            try {
                const payments = window.Square.payments(
                    applicationId,
                    locationId
                )
                const cardInstance = await payments.card()
                await cardInstance.attach(cardContainerRef.current)
                setCard(cardInstance)
                setStatus("")
            } catch (err) {
                console.error(err)
                setStatus("Failed to load payment form.")
            }
        }

        const existingScript = document.getElementById(scriptId)

        if (existingScript) {
            initialize()
            return
        }

        const script = document.createElement("script")
        script.id = scriptId
        script.src = "https://sandbox.web.squarecdn.com/v1/square.js"
        script.async = true
        script.onload = initialize

        document.body.appendChild(script)
    }, [applicationId, locationId])

    const handlePayment = async () => {
        if (!card) return

        try {
            setStatus("Processing...")

            const result = await card.tokenize()

            if (result.status !== "OK") {
                setStatus("Card tokenization failed.")
                return
            }

            const response = await fetch(checkoutUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sourceId: result.token,
                    amount,
                    variationId: "TKYWEHO6EQJVYIOA2KRSSEU6",
                    customer: {
                        givenName: "Liam",
                        email: "liam@example.com",
                        phone: "2155555555",
                    },
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                console.error(data)
                setStatus(
                    data?.detail
                        ? JSON.stringify(data.detail)
                        : data?.error || "Payment failed."
                )
                return
            }

            console.log(data)
            setStatus("Payment successful.")
        } catch (err) {
            console.error(err)
            setStatus("Something went wrong.")
        }
    }

    return (
        <div style={{ width: "100%", padding: 16 }}>
            <div
                ref={cardContainerRef}
                style={{
                    minHeight: 100,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 12,
                    background: "#fff",
                    marginBottom: 12,
                }}
            />
            <button
                onClick={handlePayment}
                style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                }}
            >
                {buttonText}
            </button>
            {status ? <div style={{ marginTop: 12 }}>{status}</div> : null}
        </div>
    )
}

addPropertyControls(SquareCheckout, {
    applicationId: {
        type: ControlType.String,
        title: "App ID",
    },
    locationId: {
        type: ControlType.String,
        title: "Location ID",
    },
    checkoutUrl: {
        type: ControlType.String,
        title: "Checkout URL",
    },
    amount: {
        type: ControlType.Number,
        title: "Amount",
        defaultValue: 2500,
    },
    buttonText: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Pay Now",
    },
})
