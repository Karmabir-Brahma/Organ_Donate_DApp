import "./style.css";

function Modal({ closeModal }) {
    return (
        <>
            <div className="modal_wrapper" />
            <div className="modal_container">
                <p>
                    No wallet detected. Please set up a wallet.
                </p>
                <div className="cntr">
                    <button onClick={closeModal}>Okay</button>
                </div>
            </div>
        </>
    )
}
export default Modal;