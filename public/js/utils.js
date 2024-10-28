function formatRupiah(input) {
    // Remove any non-numeric characters
    // let value = input.value.replace(/[^,\d]/g, '');
    // Allow for a leading minus sign and remove any non-numeric characters except the minus sign
    let value = input.value.replace(/(?!^-)[^,\d]/g, ''); 

    if (value === '') {
        input.value = ''; // If the input is empty, return
        return;
    }

    // Convert the value to an integer for formatting
    let numericValue = parseInt(value.replace(/,/g, ''));
    if (isNaN(numericValue)) return;

    // Format the value as Rupiah
    let formattedValue = new Intl.NumberFormat('id-ID').format(numericValue);

    input.value = formattedValue;
}

function viewRupiah(ini) {
    let formattedValue = new Intl.NumberFormat('id-ID').format(ini);
    return formattedValue;
}

// show messagge
function showAlert(message, type) {
    return {
        message, // Message to be displayed in an alert
        type, // Type of the alert (e.g., is-info, is-danger)
        isVisible: true, // Visibility of the alert
        hide() {
            setTimeout(() => {
                this.isVisible = false;
            }, 3000);
        }
    };
}

// function validate form
function validate() {
    return{
        errors: {},
        validateForm(fieldsDefinition, formObject) {
            this.resetErrors();
            fieldsDefinition.forEach(field => {
                this.validateField(formObject, field);
            })

            return Object.keys(this.errors).length === 0 ? true : false
        },

        validateField(formObject, field) {
            const value = formObject[field.name];
            field.rules.forEach(rule => {
                if (rule === 'required' && (!value || /^\s*$/.test(value))) {
                    this.errors[field.name] = `${field.label} tidak boleh kosong.`;
                }
            });
        },

        resetErrors() {
            this.errors = {};
        },
    }
}